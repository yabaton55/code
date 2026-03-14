import Foundation
import UserNotifications

@MainActor
final class NotificationManager: NSObject, ObservableObject {
    static let shared = NotificationManager()

    @Published var authorizationStatus: UNAuthorizationStatus = .notDetermined

    private override init() {
        super.init()
    }

    // MARK: - Permission

    func setup() {
        UNUserNotificationCenter.current().delegate = self
        refreshAuthorizationStatus()
    }

    func requestPermission() async -> Bool {
        do {
            let granted = try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .badge, .sound])
            await MainActor.run { authorizationStatus = granted ? .authorized : .denied }
            return granted
        } catch {
            return false
        }
    }

    func refreshAuthorizationStatus() {
        Task {
            let settings = await UNUserNotificationCenter.current().notificationSettings()
            await MainActor.run { authorizationStatus = settings.authorizationStatus }
        }
    }

    // MARK: - Schedule

    /// お返しリマインダーをスケジュール。既存の通知があれば上書き。
    func scheduleReturnReminder(for record: GiftRecord) async {
        guard let reminderDate = record.reminderDate,
              reminderDate > Date() else { return }

        let id = notificationID(for: record)
        cancelReminder(id: id)

        let content = UNMutableNotificationContent()
        content.title = "お返しのリマインダー"
        content.body = "\(record.giver)さんへのお返し（\(record.returnItem.isEmpty ? "品物未定" : record.returnItem)）を忘れずに！"
        content.sound = .default
        content.badge = 1

        var components = Calendar.current.dateComponents(
            [.year, .month, .day, .hour, .minute],
            from: reminderDate
        )
        components.hour = components.hour ?? 9
        components.minute = components.minute ?? 0

        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)

        do {
            try await UNUserNotificationCenter.current().add(request)
        } catch {
            print("通知のスケジュールに失敗: \(error)")
        }
    }

    /// レコードに紐づくリマインダーをキャンセル
    func cancelReturnReminder(for record: GiftRecord) {
        cancelReminder(id: notificationID(for: record))
    }

    // MARK: - Pending check

    /// このレコードの通知が登録済みか確認
    func hasPendingReminder(for record: GiftRecord) async -> Bool {
        let pending = await UNUserNotificationCenter.current().pendingNotificationRequests()
        let id = notificationID(for: record)
        return pending.contains { $0.identifier == id }
    }

    // MARK: - Helpers

    private func cancelReminder(id: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
    }

    private func notificationID(for record: GiftRecord) -> String {
        "gift-reminder-\(record.persistentModelID.hashValue)"
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension NotificationManager: UNUserNotificationCenterDelegate {
    /// アプリがフォアグラウンド中でも通知をバナー表示
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        return [.banner, .sound, .badge]
    }
}
