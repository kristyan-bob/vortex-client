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

        if let Ok(username) = std::env::var("USERNAME") {
            candidates.push(format!(r"C:\Users\{username}\AppData\Local\Vortex\Vortex.exe"));
            candidates.push(format!(r"C:\Users\{username}\AppData\Roaming\Vortex\Vortex.exe"));
        }

        if let Ok(userprofile) = std::env::var("USERPROFILE") {
            candidates.push(format!(r"{userprofile}\AppData\Local\Vortex\Vortex.exe"));
            candidates.push(format!(r"{userprofile}\AppData\Roaming\Vortex\Vortex.exe"));
        }
    }

    #[cfg(target_os = "macos")]
    {
        candidates.push("/Applications/Vortex.app".to_string());
        candidates.push("/Applications/Vortex.app/Contents/MacOS/Vortex".to_string());
        candidates.push("~/Applications/Vortex.app".to_string());
        candidates.push("~/Applications/Vortex.app/Contents/MacOS/Vortex".to_string());
    }

    #[cfg(target_os = "linux")]
    {
        candidates.push("/usr/bin/vortex".to_string());
        candidates.push("/opt/Vortex/vortex".to_string());
        candidates.push("~/vortex".to_string());
    }

    candidates
}

fn is_process_running(target_name: &str) -> bool {
    #[cfg(windows)]
    {
        let output = Command::new("cmd")
            .args(["/C", "tasklist /FO CSV /NH"])
            .output();

        if let Ok(output) = output {
            let text = String::from_utf8_lossy(&output.stdout).to_ascii_lowercase();
            return text.contains(&target_name.to_ascii_lowercase());
        }
        return false;
    }

    #[cfg(target_os = "macos")]
    {
        let output = Command::new("ps").args(["-eo", "comm="]).output();
        if let Ok(output) = output {
            let text = String::from_utf8_lossy(&output.stdout).to_ascii_lowercase();
            return text.contains(&target_name.to_ascii_lowercase());
        }
        return false;
    }

    #[cfg(target_os = "linux")]
    {
        let output = Command::new("ps").args(["-eo", "comm="]).output();
        if let Ok(output) = output {
            let text = String::from_utf8_lossy(&output.stdout).to_ascii_lowercase();
            return text.contains(&target_name.to_ascii_lowercase());
        }
        return false;
    }

    false
}

#[tauri::command]
fn detect_vortex() -> Result<String, String> {
    for candidate in detect_vortex_candidates() {
        if Path::new(&candidate).exists() {
            return Ok(candidate);
        }
    }

    Err("Vortex not found".to_string())
}

#[tauri::command]
fn get_vortex_status() -> Result<CompanionStatus, String> {
    let detected_path = detect_vortex().ok().unwrap_or_default();
    let running = {
        #[cfg(windows)]
        {
            is_process_running("vortex.exe")
        }

        #[cfg(target_os = "macos")]
        {
            is_process_running("vortex")
        }

        #[cfg(target_os = "linux")]
        {
            is_process_running("vortex")
        }

        #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
        {
            false
        }
    };

    Ok(CompanionStatus {
        installed: !detected_path.is_empty(),
        running,
        path: detected_path,
        os: std::env::consts::OS.to_string(),
    })
}

#[tauri::command]
fn launch_vortex(path: String) -> Result<(), String> {
    if path.trim().is_empty() {
        return Err("No Vortex path provided".to_string());
    }

    if !Path::new(&path).exists() {
        return Err(format!("Vortex executable not found at: {path}"));
    }

    Command::new(&path)
        .spawn()
        .map(|_| ())
        .map_err(|err| format!("Failed to launch Vortex: {err}"))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![detect_vortex, get_vortex_status, launch_vortex])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
