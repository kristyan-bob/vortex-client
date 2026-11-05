use std::path::Path;
use std::process::Command;

#[derive(Clone, serde::Serialize)]
struct CompanionStatus {
    installed: bool,
    running: bool,
    path: String,
    os: String,
}

fn detect_vortex_candidates() -> Vec<String> {
    let mut candidates = Vec::new();

    #[cfg(windows)]
    {
        candidates.push(r"C:\Program Files\Vortex\Vortex.exe".to_string());
        candidates.push(r"C:\Program Files (x86)\Vortex\Vortex.exe".to_string());
        if let Ok(userprofile) = std::env::var("USERPROFILE") {
            candidates.push(format!(r"{userprofile}\AppData\Local\Vortex\Vortex.exe"));
            candidates.push(format!(r"{userprofile}\AppData\Roaming\Vortex\Vortex.exe"));
        }
    }

    #[cfg(target_os = "macos")]
    {
        candidates.push("/Applications/Vortex.app/Contents/MacOS/Vortex".to_string());
    }

    #[cfg(target_os = "linux")]
    {
        candidates.push("/usr/bin/vortex".to_string());
        candidates.push("/opt/Vortex/vortex".to_string());
    }

    candidates
}

fn is_process_running(target_name: &str) -> bool {
    #[cfg(windows)]
    {
        if let Ok(output) = Command::new("tasklist").args(["/FO", "CSV", "/NH"]).output() {
            let text = String::from_utf8_lossy(&output.stdout).to_ascii_lowercase();
            return text.contains(&target_name.to_ascii_lowercase());
        }
    }

    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        if let Ok(output) = Command::new("ps").args(["-eo", "comm="]).output() {
            let text = String::from_utf8_lossy(&output.stdout).to_ascii_lowercase();
            return text.contains(&target_name.to_ascii_lowercase());
        }
    }

    false
}

#[tauri::command]
fn get_vortex_status() -> CompanionStatus {
    let detected_path = detect_vortex_candidates()
        .into_iter()
        .find(|candidate| Path::new(candidate).exists())
        .unwrap_or_default();

    #[cfg(windows)]
    let running = is_process_running("vortex.exe");
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    let running = is_process_running("vortex");

    CompanionStatus {
        installed: !detected_path.is_empty(),
        running,
        path: detected_path,
        os: std::env::consts::OS.to_string(),
    }
}

#[tauri::command]
fn launch_vortex(path: String) -> Result<(), String> {
    let cleaned_path = path.trim().trim_matches('"');
    if cleaned_path.is_empty() {
        return Err("No Vortex path provided".to_string());
    }
    let executable = Path::new(cleaned_path);
    if !executable.is_file() {
        return Err(format!("Vortex executable not found at: {cleaned_path}"));
    }

    Command::new(executable)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Failed to launch Vortex: {error}"))
}

#[tauri::command]
fn open_windows_graphics_settings() -> Result<(), String> {
    #[cfg(windows)]
    {
        Command::new("cmd")
            .args(["/C", "start", "", "ms-settings:display-advancedgraphics"])
            .spawn()
            .map(|_| ())
            .map_err(|error| format!("Could not open Windows Graphics settings: {error}"))
    }
    #[cfg(not(windows))]
    {
        Err("This shortcut is only available on Windows. Open your system's graphics settings manually.".to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_vortex_status, launch_vortex, open_windows_graphics_settings])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
