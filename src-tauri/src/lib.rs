#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default().plugin(tauri_plugin_updater::Builder::new().build());

  builder
    .setup(move |app| {
      #[cfg(target_os = "macos")]
      {
        let menu = tauri::menu::Menu::default(app.handle())?;
        app.set_menu(menu)?;
      }

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let app_handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        use tauri_plugin_updater::UpdaterExt;

        let updater = match app_handle.updater() {
          Ok(updater) => updater,
          Err(error) => {
            log::warn!("Updater build failed: {error}");
            return;
          }
        };

        match updater.check().await {
          Ok(Some(update)) => {
            log::info!(
              "Update available: current={} latest={}",
              app_handle.package_info().version,
              update.version
            );

            if let Err(error) = update
              .download_and_install(
                |_chunk_length, _content_length| {},
                || {},
              )
              .await
            {
              log::warn!("Update download/install failed: {error}");
            } else {
              log::info!("Update installed successfully");
            }
          }
          Ok(None) => {
            log::info!("No updates available");
          }
          Err(error) => {
            log::warn!("Update check failed: {error}");
          }
        }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
