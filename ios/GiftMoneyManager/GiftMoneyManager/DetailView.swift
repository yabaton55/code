import SwiftUI
import SwiftData

struct DetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Bindable var record: GiftRecord
    @State private var showingEditSheet = false
    @State private var showingDeleteAlert = false
    @State private var hasPendingReminder = false

    @StateObject private var notificationManager = NotificationManager.shared

    var body: some View {
        List {
            receivedSection
            returnSection
            if !record.notes.isEmpty {
                notesSection
            }
        }
        .navigationTitle(record.giver)
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    ShareLink(item: shareText) {
                        Label("共有", systemImage: "square.and.arrow.up")
                    }
                    Button("編集", systemImage: "pencil") {
                        showingEditSheet = true
                    }
                    Button("削除", systemImage: "trash", role: .destructive) {
                        showingDeleteAlert = true
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .sheet(isPresented: $showingEditSheet) {
            AddEditView(record: record)
        }
        .onAppear {
            Task { hasPendingReminder = await notificationManager.hasPendingReminder(for: record) }
        }
        .onChange(of: showingEditSheet) { _, isShowing in
            if !isShowing {
                Task { hasPendingReminder = await notificationManager.hasPendingReminder(for: record) }
            }
        }
        .onChange(of: record.returnDone) { _, done in
            if done {
                notificationManager.cancelReturnReminder(for: record)
                record.reminderDate = nil
                hasPendingReminder = false
            }
        }
        .alert("削除しますか？", isPresented: $showingDeleteAlert) {
            Button("削除", role: .destructive) {
                modelContext.delete(record)
                dismiss()
            }
            Button("キャンセル", role: .cancel) {}
        } message: {
            Text("この記録は完全に削除されます。")
        }
    }

    // MARK: - Sections

    private var receivedSection: some View {
        Section("もらった情報") {
            DetailRow(label: "もらった人", value: record.giver, icon: "person.fill", color: .blue)
            DetailRow(
                label: "もらったもの",
                value: record.receivedItem.isEmpty ? "—" : record.receivedItem,
                icon: "gift.fill",
                color: .pink
            )
            DetailRow(label: "時期", value: formattedDate(record.receivedDate), icon: "calendar", color: .orange)
            DetailRow(label: "金額", value: formattedAmount(record.amount), icon: "yensign.circle.fill", color: .green)
        }
    }

    private var returnSection: some View {
        Section("お返し情報") {
            if !record.hasReturn {
                HStack {
                    Image(systemName: "xmark.circle.fill").foregroundStyle(.gray)
                    Text("お返し不要")
                        .foregroundStyle(.secondary)
                }
            } else {
                returnBudgetRow
                DetailRow(
                    label: "あげるもの",
                    value: record.returnItem.isEmpty ? "—" : record.returnItem,
                    icon: "shippingbox.fill",
                    color: .purple
                )
                if let rd = record.returnDate {
                    DetailRow(label: "あげる時期", value: formattedDate(rd), icon: "calendar.badge.clock", color: .teal)
                }
                returnStatusRow
                if !record.returnDone {
                    reminderRow
                }
            }
        }
    }

    private var reminderRow: some View {
        HStack(spacing: 12) {
            Image(systemName: hasPendingReminder ? "bell.fill" : "bell.slash")
                .foregroundStyle(hasPendingReminder ? .yellow : .secondary)
                .frame(width: 24)
            VStack(alignment: .leading, spacing: 2) {
                Text("リマインダー").font(.caption).foregroundStyle(.secondary)
                if let rd = record.reminderDate, hasPendingReminder {
                    Text(formattedDateTime(rd))
                        .font(.body)
                } else {
                    Text("未設定")
                        .font(.body)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var returnBudgetRow: some View {
        HStack {
            Image(systemName: "banknote.fill").foregroundStyle(.indigo)
            VStack(alignment: .leading, spacing: 2) {
                Text("お返しの目安").font(.caption).foregroundStyle(.secondary)
                Text(record.returnBudget > 0
                     ? formattedAmount(record.returnBudget)
                     : formattedAmount(record.suggestedReturnBudget()) + "（目安）")
                    .font(.body)
            }
        }
    }

    private var returnStatusRow: some View {
        HStack {
            Image(systemName: record.returnDone ? "checkmark.circle.fill" : "clock.fill")
                .foregroundStyle(record.returnDone ? .blue : .orange)
            Text(record.returnDone ? "返礼済み" : "返礼未了")
                .foregroundStyle(record.returnDone ? .blue : .orange)
                .fontWeight(.medium)
            Spacer()
            Toggle("", isOn: $record.returnDone)
                .labelsHidden()
        }
    }

    private var notesSection: some View {
        Section("備考") {
            Text(record.notes)
                .font(.body)
        }
    }

    // MARK: - Share

    private var shareText: String {
        var lines: [String] = ["【贈り物メモ】"]
        lines.append("もらった人：\(record.giver)")
        if !record.receivedItem.isEmpty {
            lines.append("もらったもの：\(record.receivedItem)")
        }
        lines.append("時期：\(formattedDate(record.receivedDate))")
        lines.append("金額：\(formattedAmount(record.amount))")

        if record.hasReturn {
            lines.append("")
            lines.append("【お返し情報】")
            let budget = record.returnBudget > 0 ? record.returnBudget : record.suggestedReturnBudget()
            lines.append("目安：\(formattedAmount(budget))")
            if !record.returnItem.isEmpty {
                lines.append("あげるもの：\(record.returnItem)")
            }
            if let rd = record.returnDate {
                lines.append("あげる時期：\(formattedDate(rd))")
            }
            lines.append("状態：\(record.returnDone ? "返礼済み" : "返礼未了")")
        } else {
            lines.append("お返し：不要")
        }

        if !record.notes.isEmpty {
            lines.append("")
            lines.append("備考：\(record.notes)")
        }

        return lines.joined(separator: "\n")
    }

    // MARK: - Helpers

    private func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .long
        formatter.locale = Locale(identifier: "ja_JP")
        return formatter.string(from: date)
    }

    private func formattedDateTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .long
        formatter.timeStyle = .short
        formatter.locale = Locale(identifier: "ja_JP")
        return formatter.string(from: date)
    }

    private func formattedAmount(_ amount: Int) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "JPY"
        formatter.currencySymbol = "¥"
        return formatter.string(from: NSNumber(value: amount)) ?? "¥\(amount)"
    }
}

// MARK: - DetailRow

struct DetailRow: View {
    let label: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(color)
                .frame(width: 24)
            VStack(alignment: .leading, spacing: 2) {
                Text(label).font(.caption).foregroundStyle(.secondary)
                Text(value).font(.body)
            }
        }
    }
}
