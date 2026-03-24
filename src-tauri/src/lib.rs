#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let updater_pubkey = std::env::var("TAURI_UPDATER_PUBKEY").ok();
  let updater_endpoint = std::env::var("TAURI_UPDATER_ENDPOINT").ok();

  let builder = tauri::Builder::default().plugin(tauri_plugin_updater::Builder::new().build());

  builder
    .setup(move |app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      if let (Some(pubkey), Some(endpoint)) = (updater_pubkey.clone(), updater_endpoint.clone()) {
        if !pubkey.trim().is_empty() && !endpoint.trim().is_empty() {
          let app_handle = app.handle().clone();
          tauri::async_runtime::spawn(async move {
            use tauri_plugin_updater::UpdaterExt;

            let endpoint_url = match endpoint.parse() {
              Ok(url) => url,
              Err(error) => {
                log::warn!("Invalid TAURI_UPDATER_ENDPOINT: {error}");
                return;
              }
            };

            let updater_builder = match app_handle
              .updater_builder()
              .pubkey(pubkey)
              .endpoints(vec![endpoint_url])
            {
              Ok(builder) => builder,
              Err(error) => {
                log::warn!("Updater endpoint configuration failed: {error}");
                return;
              }
            };

            let updater = match updater_builder.build() {
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
              }
              Ok(None) => {
                log::info!("No updates available");
              }
              Err(error) => {
                log::warn!("Update check failed: {error}");
              }
            }
          });
        }
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
