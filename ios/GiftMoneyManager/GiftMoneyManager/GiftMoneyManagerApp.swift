import SwiftUI
import SwiftData

@main
struct GiftMoneyManagerApp: App {
    init() {
        NotificationManager.shared.setup()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .onReceive(NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)) { _ in
                    NotificationManager.shared.refreshAuthorizationStatus()
                }
        }
        .modelContainer(for: GiftRecord.self)
    }
}
