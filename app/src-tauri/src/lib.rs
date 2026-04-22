// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
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
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![ping, launch_game])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
