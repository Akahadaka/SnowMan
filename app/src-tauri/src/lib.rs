// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use rusqlite::{params, Connection};
use serde::Deserialize;
use serde::Serialize;
use std::collections::BTreeMap;
use std::fs::{self, File};
use std::io::{self, Cursor, Read, Write};
use std::path::{Path, PathBuf};
use tauri::Manager;
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

#[derive(Deserialize)]
struct CatalogModEntryInput {
    id: String,
    name: String,
    description: String,
    mod_io_url: String,
    download_url: String,
    base_install_steps_json: String,
    options_json: String,
}

#[derive(Serialize)]
struct CatalogModEntryRecord {
    id: String,
    name: String,
    description: String,
    mod_io_url: String,
    download_url: String,
    base_install_steps_json: String,
    options_json: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModioCatalogEntryInput {
    modio_id: i64,
    name: String,
    summary: String,
    profile_url: String,
    thumbnail_url: String,
    download_url: String,
    modfile_id: i64,
    modfile_version: String,
    tags_json: String,
    date_updated: i64,
    downloads_total: i64,
    subscribers_total: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ModioCatalogEntryRecord {
    modio_id: i64,
    name: String,
    summary: String,
    profile_url: String,
    thumbnail_url: String,
    download_url: String,
    modfile_id: i64,
    modfile_version: String,
    tags_json: String,
    date_updated: i64,
    downloads_total: i64,
    subscribers_total: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProfileModSelectionRecord {
    mod_id: String,
    selected_options_json: String,
}

fn catalog_db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed resolving app data dir: {e}"))?;
    fs::create_dir_all(&app_data).map_err(|e| format!("Failed creating app data dir: {e}"))?;
    Ok(app_data.join("snowman-catalog.db"))
}

fn open_catalog_connection(app: &tauri::AppHandle) -> Result<Connection, String> {
    let db_path = catalog_db_path(app)?;
    let conn = Connection::open(&db_path).map_err(|e| {
        format!(
            "Failed opening SQLite database '{}': {e}",
            db_path.display()
        )
    })?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS mods (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          mod_io_url TEXT NOT NULL,
          download_url TEXT NOT NULL,
          base_install_steps_json TEXT NOT NULL,
          options_json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS mods_fts
        USING fts5(mod_id, name, description, tokenize='unicode61');

        CREATE TABLE IF NOT EXISTS profile_mods (
          profile_id TEXT NOT NULL,
          mod_id TEXT NOT NULL,
          selected_options_json TEXT NOT NULL,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY (profile_id, mod_id)
        );

                CREATE TABLE IF NOT EXISTS modio_mods (
                    modio_id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    profile_url TEXT NOT NULL,
                    thumbnail_url TEXT NOT NULL,
                    download_url TEXT NOT NULL,
                    modfile_id INTEGER NOT NULL,
                    modfile_version TEXT NOT NULL,
                    tags_json TEXT NOT NULL,
                    date_updated INTEGER NOT NULL,
                    downloads_total INTEGER NOT NULL,
                    subscribers_total INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                );

                CREATE VIRTUAL TABLE IF NOT EXISTS modio_mods_fts
                USING fts5(modio_id UNINDEXED, name, summary, tags, tokenize='unicode61');

        CREATE INDEX IF NOT EXISTS idx_profile_mods_profile ON profile_mods(profile_id);
        CREATE INDEX IF NOT EXISTS idx_profile_mods_mod ON profile_mods(mod_id);
        CREATE INDEX IF NOT EXISTS idx_modio_mods_updated ON modio_mods(date_updated DESC);
        ",
    )
    .map_err(|e| format!("Failed applying SQLite schema: {e}"))?;

    Ok(conn)
}

fn current_unix_timestamp() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
}

fn to_match_query(value: &str) -> String {
    let tokens: Vec<String> = value
        .split_whitespace()
        .map(|token| token.trim())
        .filter(|token| !token.is_empty())
        .map(|token| format!("\"{}\"*", token.replace('"', "")))
        .collect();

    if tokens.is_empty() {
        String::new()
    } else {
        tokens.join(" AND ")
    }
}

#[tauri::command]
fn sync_mod_catalog(
    app: tauri::AppHandle,
    entries: Vec<CatalogModEntryInput>,
) -> Result<(), String> {
    let mut conn = open_catalog_connection(&app)?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed starting SQLite transaction: {e}"))?;

    let updated_at = current_unix_timestamp();

    for entry in &entries {
        tx.execute(
            "
            INSERT INTO mods (
              id, name, description, mod_io_url, download_url,
              base_install_steps_json, options_json, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            ON CONFLICT(id) DO UPDATE SET
              name=excluded.name,
              description=excluded.description,
              mod_io_url=excluded.mod_io_url,
              download_url=excluded.download_url,
              base_install_steps_json=excluded.base_install_steps_json,
              options_json=excluded.options_json,
              updated_at=excluded.updated_at
            ",
            params![
                entry.id,
                entry.name,
                entry.description,
                entry.mod_io_url,
                entry.download_url,
                entry.base_install_steps_json,
                entry.options_json,
                updated_at,
            ],
        )
        .map_err(|e| format!("Failed upserting catalog mod '{}': {e}", entry.id))?;

        tx.execute("DELETE FROM mods_fts WHERE mod_id = ?1", params![entry.id])
            .map_err(|e| format!("Failed pruning search index for '{}': {e}", entry.id))?;

        tx.execute(
            "INSERT INTO mods_fts (mod_id, name, description) VALUES (?1, ?2, ?3)",
            params![entry.id, entry.name, entry.description],
        )
        .map_err(|e| format!("Failed indexing mod '{}': {e}", entry.id))?;
    }

    tx.commit()
        .map_err(|e| format!("Failed committing SQLite transaction: {e}"))?;
    Ok(())
}

#[tauri::command]
fn search_mod_catalog(
    app: tauri::AppHandle,
    query: String,
    limit: Option<i64>,
) -> Result<Vec<CatalogModEntryRecord>, String> {
    let conn = open_catalog_connection(&app)?;
    let row_limit = limit.unwrap_or(200).clamp(1, 1000);
    let trimmed = query.trim();

    let sql_all = "
      SELECT id, name, description, mod_io_url, download_url, base_install_steps_json, options_json
      FROM mods
      ORDER BY name COLLATE NOCASE
      LIMIT ?1
    ";

    let sql_search = "
      SELECT m.id, m.name, m.description, m.mod_io_url, m.download_url, m.base_install_steps_json, m.options_json
      FROM mods_fts f
      JOIN mods m ON m.id = f.mod_id
      WHERE mods_fts MATCH ?1
      ORDER BY bm25(mods_fts)
      LIMIT ?2
    ";

    let mut records = Vec::new();
    if trimmed.is_empty() {
        let mut stmt = conn
            .prepare(sql_all)
            .map_err(|e| format!("Failed preparing catalog query: {e}"))?;
        let rows = stmt
            .query_map(params![row_limit], |row| {
                Ok(CatalogModEntryRecord {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    mod_io_url: row.get(3)?,
                    download_url: row.get(4)?,
                    base_install_steps_json: row.get(5)?,
                    options_json: row.get(6)?,
                })
            })
            .map_err(|e| format!("Failed executing catalog query: {e}"))?;

        for row in rows {
            records.push(row.map_err(|e| format!("Failed reading catalog row: {e}"))?);
        }
        return Ok(records);
    }

    let match_query = to_match_query(trimmed);
    if match_query.is_empty() {
        return Ok(records);
    }

    let mut stmt = conn
        .prepare(sql_search)
        .map_err(|e| format!("Failed preparing search query: {e}"))?;
    let rows = stmt
        .query_map(params![match_query, row_limit], |row| {
            Ok(CatalogModEntryRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                mod_io_url: row.get(3)?,
                download_url: row.get(4)?,
                base_install_steps_json: row.get(5)?,
                options_json: row.get(6)?,
            })
        })
        .map_err(|e| format!("Failed executing search query: {e}"))?;

    for row in rows {
        records.push(row.map_err(|e| format!("Failed reading search row: {e}"))?);
    }

    Ok(records)
}

#[tauri::command]
fn sync_modio_catalog(
    app: tauri::AppHandle,
    entries: Vec<ModioCatalogEntryInput>,
) -> Result<(), String> {
    let mut conn = open_catalog_connection(&app)?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed starting SQLite transaction: {e}"))?;

    let updated_at = current_unix_timestamp();

    for entry in &entries {
        tx.execute(
            "
            INSERT INTO modio_mods (
              modio_id, name, summary, profile_url, thumbnail_url, download_url,
              modfile_id, modfile_version, tags_json, date_updated, downloads_total,
              subscribers_total, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
            ON CONFLICT(modio_id) DO UPDATE SET
              name=excluded.name,
              summary=excluded.summary,
              profile_url=excluded.profile_url,
              thumbnail_url=excluded.thumbnail_url,
              download_url=excluded.download_url,
              modfile_id=excluded.modfile_id,
              modfile_version=excluded.modfile_version,
              tags_json=excluded.tags_json,
              date_updated=excluded.date_updated,
              downloads_total=excluded.downloads_total,
              subscribers_total=excluded.subscribers_total,
              updated_at=excluded.updated_at
            ",
            params![
                entry.modio_id,
                entry.name,
                entry.summary,
                entry.profile_url,
                entry.thumbnail_url,
                entry.download_url,
                entry.modfile_id,
                entry.modfile_version,
                entry.tags_json,
                entry.date_updated,
                entry.downloads_total,
                entry.subscribers_total,
                updated_at,
            ],
        )
        .map_err(|e| format!("Failed upserting mod.io catalog mod '{}': {e}", entry.modio_id))?;

        tx.execute(
            "DELETE FROM modio_mods_fts WHERE modio_id = ?1",
            params![entry.modio_id],
        )
        .map_err(|e| {
            format!(
                "Failed pruning mod.io search index for '{}': {e}",
                entry.modio_id
            )
        })?;

        tx.execute(
            "
            INSERT INTO modio_mods_fts (modio_id, name, summary, tags)
            VALUES (?1, ?2, ?3, ?4)
            ",
            params![entry.modio_id, entry.name, entry.summary, entry.tags_json],
        )
        .map_err(|e| format!("Failed indexing mod.io mod '{}': {e}", entry.modio_id))?;
    }

    tx.commit()
        .map_err(|e| format!("Failed committing SQLite transaction: {e}"))?;
    Ok(())
}

#[tauri::command]
fn search_modio_catalog(
    app: tauri::AppHandle,
    query: String,
    limit: Option<i64>,
) -> Result<Vec<ModioCatalogEntryRecord>, String> {
    let conn = open_catalog_connection(&app)?;
    let row_limit = limit.unwrap_or(2000).clamp(1, 5000);
    let trimmed = query.trim();

    let sql_all = "
      SELECT
        modio_id, name, summary, profile_url, thumbnail_url, download_url,
        modfile_id, modfile_version, tags_json, date_updated, downloads_total, subscribers_total
      FROM modio_mods
      ORDER BY date_updated DESC, name COLLATE NOCASE
      LIMIT ?1
    ";

    let sql_search = "
      SELECT
        m.modio_id, m.name, m.summary, m.profile_url, m.thumbnail_url, m.download_url,
        m.modfile_id, m.modfile_version, m.tags_json, m.date_updated, m.downloads_total, m.subscribers_total
      FROM modio_mods_fts f
      JOIN modio_mods m ON m.modio_id = f.modio_id
      WHERE modio_mods_fts MATCH ?1
      ORDER BY bm25(modio_mods_fts)
      LIMIT ?2
    ";

    let mut records = Vec::new();
    if trimmed.is_empty() {
        let mut stmt = conn
            .prepare(sql_all)
            .map_err(|e| format!("Failed preparing mod.io catalog query: {e}"))?;
        let rows = stmt
            .query_map(params![row_limit], |row| {
                Ok(ModioCatalogEntryRecord {
                    modio_id: row.get(0)?,
                    name: row.get(1)?,
                    summary: row.get(2)?,
                    profile_url: row.get(3)?,
                    thumbnail_url: row.get(4)?,
                    download_url: row.get(5)?,
                    modfile_id: row.get(6)?,
                    modfile_version: row.get(7)?,
                    tags_json: row.get(8)?,
                    date_updated: row.get(9)?,
                    downloads_total: row.get(10)?,
                    subscribers_total: row.get(11)?,
                })
            })
            .map_err(|e| format!("Failed executing mod.io catalog query: {e}"))?;

        for row in rows {
            records.push(row.map_err(|e| format!("Failed reading mod.io catalog row: {e}"))?);
        }

        return Ok(records);
    }

    let match_query = to_match_query(trimmed);
    if match_query.is_empty() {
        return Ok(records);
    }

    let mut stmt = conn
        .prepare(sql_search)
        .map_err(|e| format!("Failed preparing mod.io search query: {e}"))?;
    let rows = stmt
        .query_map(params![match_query, row_limit], |row| {
            Ok(ModioCatalogEntryRecord {
                modio_id: row.get(0)?,
                name: row.get(1)?,
                summary: row.get(2)?,
                profile_url: row.get(3)?,
                thumbnail_url: row.get(4)?,
                download_url: row.get(5)?,
                modfile_id: row.get(6)?,
                modfile_version: row.get(7)?,
                tags_json: row.get(8)?,
                date_updated: row.get(9)?,
                downloads_total: row.get(10)?,
                subscribers_total: row.get(11)?,
            })
        })
        .map_err(|e| format!("Failed executing mod.io search query: {e}"))?;

    for row in rows {
        records.push(row.map_err(|e| format!("Failed reading mod.io search row: {e}"))?);
    }

    Ok(records)
}

#[tauri::command]
fn upsert_profile_mod_selection(
    app: tauri::AppHandle,
    profile_id: String,
    mod_id: String,
    selected_options_json: String,
) -> Result<(), String> {
    if profile_id.trim().is_empty() {
        return Err("profile_id is empty".to_string());
    }
    if mod_id.trim().is_empty() {
        return Err("mod_id is empty".to_string());
    }

    let conn = open_catalog_connection(&app)?;
    conn.execute(
        "
        INSERT INTO profile_mods(profile_id, mod_id, selected_options_json, updated_at)
        VALUES(?1, ?2, ?3, ?4)
        ON CONFLICT(profile_id, mod_id) DO UPDATE SET
          selected_options_json=excluded.selected_options_json,
          updated_at=excluded.updated_at
        ",
        params![
            profile_id,
            mod_id,
            selected_options_json,
            current_unix_timestamp(),
        ],
    )
    .map_err(|e| format!("Failed upserting profile mod selection: {e}"))?;

    Ok(())
}

#[tauri::command]
fn get_profile_mod_selections(
    app: tauri::AppHandle,
    profile_id: String,
) -> Result<Vec<ProfileModSelectionRecord>, String> {
    if profile_id.trim().is_empty() {
        return Ok(vec![]);
    }

    let conn = open_catalog_connection(&app)?;
    let mut stmt = conn
        .prepare(
            "
            SELECT mod_id, selected_options_json
            FROM profile_mods
            WHERE profile_id = ?1
            ORDER BY mod_id COLLATE NOCASE
            ",
        )
        .map_err(|e| format!("Failed preparing profile selection query: {e}"))?;

    let rows = stmt
        .query_map(params![profile_id], |row| {
            Ok(ProfileModSelectionRecord {
                mod_id: row.get(0)?,
                selected_options_json: row.get(1)?,
            })
        })
        .map_err(|e| format!("Failed executing profile selection query: {e}"))?;

    let mut records = Vec::new();
    for row in rows {
        records.push(row.map_err(|e| format!("Failed reading profile selection row: {e}"))?);
    }

    Ok(records)
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
    install_strategy: Option<String>,
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

fn apply_direct_copy(source_abs: &Path, target_abs: &Path) -> Result<(), String> {
    copy_with_parent(source_abs, target_abs)
}

fn apply_archive_overlay(source_abs: &Path, target_abs: &Path) -> Result<(), String> {
    if target_abs
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| !ext.eq_ignore_ascii_case("pak"))
        .unwrap_or(true)
    {
        return Err(format!(
            "archive-overlay strategy requires .pak target, got '{}'",
            target_abs.display()
        ));
    }

    apply_overlay_to_archive(target_abs, source_abs)
}

fn apply_copy_with_strategy(
    strategy: &str,
    source_abs: &Path,
    target_abs: &Path,
) -> Result<(), String> {
    match strategy {
        "direct-copy" => apply_direct_copy(source_abs, target_abs),
        "archive-overlay" => apply_archive_overlay(source_abs, target_abs),
        other => Err(format!("Unknown install strategy '{other}'")),
    }
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

fn download_and_extract_zip_blocking(url: String, destination_path: String) -> Result<String, String> {
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
async fn download_and_extract_zip(url: String, destination_path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        download_and_extract_zip_blocking(url, destination_path)
    })
    .await
    .map_err(|e| format!("Download worker failed: {e}"))?
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
        let strategy = copy.install_strategy.as_deref().unwrap_or("direct-copy");
        apply_copy_with_strategy(strategy, &source_abs, &target_abs)?;
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
        let result = download_and_extract_zip_blocking("".to_string(), "".to_string());

        assert!(result.is_err());
    }

    #[test]
    fn to_match_query_builds_prefix_match_safely() {
        let result = to_match_query("real life mod");

        assert_eq!(result, "\"real\"* AND \"life\"* AND \"mod\"*");
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
            deploy_launch_restore,
            sync_mod_catalog,
            search_mod_catalog,
            sync_modio_catalog,
            search_modio_catalog,
            upsert_profile_mod_selection,
            get_profile_mod_selections
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
