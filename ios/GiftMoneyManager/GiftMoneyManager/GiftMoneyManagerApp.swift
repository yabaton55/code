import SwiftUI
import SwiftData

@main
struct GiftMoneyManagerApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: GiftRecord.self)
    }
}
