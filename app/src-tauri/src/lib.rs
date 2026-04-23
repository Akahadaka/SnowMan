// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::Deserialize;
use std::collections::BTreeMap;
use std::fs::{self, File};
use std::io::{self, Cursor, Read, Write};
use std::path::{Path, PathBuf};
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipArchive, ZipWriter};

#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

fn spawn_game_process(executable_path: &str) -> Result<(), String> {
    if executable_path.trim().is_empty() {
        return Err("Executable path is empty.".to_string());
    }

    std::process::Command::new(executable_path)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Failed to launch executable: {error}"))
}

#[tauri::command]
fn launch_game(executable_path: String) -> Result<(), String> {
    spawn_game_process(&executable_path)
}

#[derive(Deserialize)]
struct BackupItem {
    target_path: String,
    backup_path: String,
}

#[derive(Deserialize)]
struct CopyItem {
    source_path: String,
    target_path: String,
}

fn normalize_join(root: &Path, relative: &str) -> PathBuf {
    root.join(relative.replace('/', std::path::MAIN_SEPARATOR.to_string().as_str()))
}

fn copy_with_parent(src: &Path, dst: &Path) -> Result<(), String> {
    let parent = dst
        .parent()
        .ok_or_else(|| "Target path has no parent directory".to_string())?;

    fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {e}"))?;
    fs::copy(src, dst).map_err(|e| {
        format!(
            "Failed to copy '{}' -> '{}': {e}",
            src.display(),
            dst.display()
        )
    })?;
    Ok(())
}

fn is_pak_target(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("pak"))
        .unwrap_or(false)
}

fn collect_overlay_entries(source: &Path) -> Result<BTreeMap<String, Vec<u8>>, String> {
    if !source.exists() {
        return Err(format!(
            "Overlay source does not exist: {}",
            source.display()
        ));
    }

    let mut entries = BTreeMap::new();

    if source.is_file() {
        let name = source
            .file_name()
            .and_then(|v| v.to_str())
            .ok_or_else(|| "Invalid overlay source file name".to_string())?
            .replace('\\', "/");
        let bytes = fs::read(source)
            .map_err(|e| format!("Failed reading overlay file '{}': {e}", source.display()))?;
        entries.insert(name, bytes);
        return Ok(entries);
    }

    let root_name = source
        .file_name()
        .and_then(|v| v.to_str())
        .ok_or_else(|| "Invalid overlay source directory name".to_string())?
        .to_string();

    let mut stack = vec![source.to_path_buf()];
    while let Some(current) = stack.pop() {
        let read_dir = fs::read_dir(&current).map_err(|e| {
            format!(
                "Failed reading overlay directory '{}': {e}",
                current.display()
            )
        })?;

        for entry in read_dir {
            let dir_entry = entry.map_err(|e| {
                format!(
                    "Failed reading directory entry '{}': {e}",
                    current.display()
                )
            })?;
            let path = dir_entry.path();

            if path.is_dir() {
                stack.push(path);
                continue;
            }

            let relative = path
                .strip_prefix(source)
                .map_err(|e| format!("Failed computing overlay relative path: {e}"))?;
            let rel_text = relative.to_string_lossy().replace('\\', "/");
            let zip_path = format!("{root_name}/{rel_text}");
            let bytes = fs::read(&path)
                .map_err(|e| format!("Failed reading overlay file '{}': {e}", path.display()))?;
            entries.insert(zip_path, bytes);
        }
    }

    Ok(entries)
}

fn read_zip_entries(zip_path: &Path) -> Result<BTreeMap<String, Vec<u8>>, String> {
    let file = File::open(zip_path).map_err(|e| {
        format!(
            "Failed opening target archive '{}': {e}",
            zip_path.display()
        )
    })?;
    let mut archive = ZipArchive::new(file)
        .map_err(|e| format!("Failed parsing archive '{}': {e}", zip_path.display()))?;

    let mut entries = BTreeMap::new();

    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|e| format!("Failed reading archive entry: {e}"))?;

        if entry.is_dir() {
            continue;
        }

        let mut data = Vec::new();
        entry
            .read_to_end(&mut data)
            .map_err(|e| format!("Failed reading archive entry bytes: {e}"))?;
        let name = entry.name().replace('\\', "/");
        entries.insert(name, data);
    }

    Ok(entries)
}

fn write_zip_entries(zip_path: &Path, entries: &BTreeMap<String, Vec<u8>>) -> Result<(), String> {
    let tmp_path = zip_path.with_extension("pak.snowman.tmp");
    let file = File::create(&tmp_path)
        .map_err(|e| format!("Failed creating temp archive '{}': {e}", tmp_path.display()))?;
    let mut writer = ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);

    for (name, data) in entries {
        writer
            .start_file(name, options)
            .map_err(|e| format!("Failed adding archive entry '{name}': {e}"))?;
        writer
            .write_all(data)
            .map_err(|e| format!("Failed writing archive entry '{name}': {e}"))?;
    }

    writer
        .finish()
        .map_err(|e| format!("Failed finalizing temp archive: {e}"))?;

    if zip_path.exists() {
        fs::remove_file(zip_path)
            .map_err(|e| format!("Failed replacing archive '{}': {e}", zip_path.display()))?;
    }
    fs::rename(&tmp_path, zip_path).map_err(|e| {
        format!(
            "Failed moving temp archive '{}' to '{}': {e}",
            tmp_path.display(),
            zip_path.display()
        )
    })?;

    Ok(())
}

fn apply_overlay_to_archive(target_archive: &Path, overlay_source: &Path) -> Result<(), String> {
    let mut entries = read_zip_entries(target_archive)?;
    let overlays = collect_overlay_entries(overlay_source)?;

    for (key, value) in overlays {
        entries.insert(key, value);
    }

    write_zip_entries(target_archive, &entries)
}

fn clear_directory(path: &Path) -> Result<(), String> {
    if path.exists() {
        fs::remove_dir_all(path).map_err(|e| format!("Failed to clear destination folder: {e}"))?;
    }
    fs::create_dir_all(path).map_err(|e| format!("Failed to create destination folder: {e}"))?;
    Ok(())
}

fn extract_zip_to_path(bytes: &[u8], destination: &Path) -> Result<(), String> {
    let reader = Cursor::new(bytes);
    let mut archive =
        zip::ZipArchive::new(reader).map_err(|e| format!("Invalid zip archive: {e}"))?;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Failed reading zip entry: {e}"))?;

        let enclosed = file
            .enclosed_name()
            .ok_or_else(|| "Zip entry path traversal detected".to_string())?
            .to_path_buf();

        let out_path = destination.join(enclosed);

        if file.name().ends_with('/') {
            fs::create_dir_all(&out_path)
                .map_err(|e| format!("Failed to create extracted directory: {e}"))?;
            continue;
        }

        let parent = out_path
            .parent()
            .ok_or_else(|| "Extracted file has no parent path".to_string())?;
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create extracted parent directory: {e}"))?;

        let mut output = File::create(&out_path).map_err(|e| {
            format!(
                "Failed to create extracted file '{}': {e}",
                out_path.display()
            )
        })?;
        io::copy(&mut file, &mut output).map_err(|e| {
            format!(
                "Failed to write extracted file '{}': {e}",
                out_path.display()
            )
        })?;
    }

    Ok(())
}

#[tauri::command]
fn download_and_extract_zip(url: String, destination_path: String) -> Result<String, String> {
    if url.trim().is_empty() {
        return Err("Download URL is empty.".to_string());
    }
    if destination_path.trim().is_empty() {
        return Err("Destination path is empty.".to_string());
    }

    let destination = PathBuf::from(destination_path);
    clear_directory(&destination)?;

    let response = reqwest::blocking::get(&url).map_err(|e| format!("Download failed: {e}"))?;
    let ok_response = response
        .error_for_status()
        .map_err(|e| format!("Download status error: {e}"))?;
    let bytes = ok_response
        .bytes()
        .map_err(|e| format!("Failed reading download bytes: {e}"))?;

    extract_zip_to_path(&bytes, &destination)?;
    Ok(destination.to_string_lossy().to_string())
}

#[tauri::command]
fn deploy_launch_restore(
    executable_path: String,
    install_root_path: String,
    backups: Vec<BackupItem>,
    copies: Vec<CopyItem>,
) -> Result<(), String> {
    if executable_path.trim().is_empty() {
        return Err("Executable path is empty.".to_string());
    }
    if install_root_path.trim().is_empty() {
        return Err("Install root path is empty.".to_string());
    }

    let install_root = PathBuf::from(install_root_path);

    for backup in &backups {
        let target_abs = normalize_join(&install_root, &backup.target_path);
        if target_abs.exists() {
            let backup_abs = PathBuf::from(&backup.backup_path);
            copy_with_parent(&target_abs, &backup_abs)?;
        }
    }

    for copy in &copies {
        let source_abs = PathBuf::from(&copy.source_path);
        let target_abs = normalize_join(&install_root, &copy.target_path);

        if is_pak_target(&target_abs) {
            apply_overlay_to_archive(&target_abs, &source_abs)?;
        } else {
            copy_with_parent(&source_abs, &target_abs)?;
        }
    }

    let mut child = std::process::Command::new(&executable_path)
        .spawn()
        .map_err(|e| format!("Failed to launch executable: {e}"))?;

    child
        .wait()
        .map_err(|e| format!("Failed waiting for game process exit: {e}"))?;

    for backup in backups.iter().rev() {
        let target_abs = normalize_join(&install_root, &backup.target_path);
        let backup_abs = PathBuf::from(&backup.backup_path);
        if backup_abs.exists() {
            copy_with_parent(&backup_abs, &target_abs)?;
            let _ = fs::remove_file(&backup_abs);
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ping_returns_pong() {
        assert_eq!(ping(), "pong");
    }

    #[test]
    fn launch_game_rejects_empty_path() {
        let result = spawn_game_process("");

        assert!(result.is_err());
    }

    #[test]
    fn download_and_extract_zip_rejects_empty_inputs() {
        let result = download_and_extract_zip("".to_string(), "".to_string());

        assert!(result.is_err());
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            ping,
            launch_game,
            download_and_extract_zip,
            deploy_launch_restore
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
