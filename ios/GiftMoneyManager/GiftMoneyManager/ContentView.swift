import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \GiftRecord.receivedDate, order: .reverse) private var records: [GiftRecord]

    @State private var showingAddSheet = false
    @State private var searchText = ""
    @State private var filterReturnPending = false

    private var filtered: [GiftRecord] {
        records.filter { record in
            let matchesSearch = searchText.isEmpty
                || record.giver.localizedCaseInsensitiveContains(searchText)
                || record.receivedItem.localizedCaseInsensitiveContains(searchText)
            let matchesFilter = !filterReturnPending
                || (record.hasReturn && !record.returnDone)
            return matchesSearch && matchesFilter
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if records.isEmpty {
                    emptyState
                } else {
                    list
                }
            }
            .navigationTitle("ご祝儀帳")
            .searchable(text: $searchText, prompt: "名前・品物で検索")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    filterButton
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingAddSheet = true }) {
                        Label("追加", systemImage: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddSheet) {
                AddEditView()
            }
        }
    }

    // MARK: - Subviews

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "gift")
                .font(.system(size: 60))
                .foregroundStyle(.secondary)
            Text("まだ記録がありません")
                .font(.title3)
                .foregroundStyle(.secondary)
            Button("最初の記録を追加") {
                showingAddSheet = true
            }
            .buttonStyle(.borderedProminent)
        }
    }

    private var list: some View {
        List {
            summarySection
            ForEach(filtered) { record in
                NavigationLink(destination: DetailView(record: record)) {
                    RecordRow(record: record)
                }
            }
            .onDelete(perform: deleteRecords)
        }
    }

    private var summarySection: some View {
        Section {
            HStack {
                summaryCard(
                    title: "総件数",
                    value: "\(records.count)件",
                    icon: "list.bullet",
                    color: .blue
                )
                Divider()
                summaryCard(
                    title: "総金額",
                    value: formatted(records.reduce(0) { $0 + $1.amount }),
                    icon: "yensign.circle",
                    color: .green
                )
                Divider()
                summaryCard(
                    title: "お返し未了",
                    value: "\(records.filter { $0.hasReturn && !$0.returnDone }.count)件",
                    icon: "arrow.uturn.left.circle",
                    color: .orange
                )
            }
            .padding(.vertical, 4)
        }
    }

    private func summaryCard(title: String, value: String, icon: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon).foregroundStyle(color)
            Text(value).font(.headline)
            Text(title).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    private var filterButton: some View {
        Button(action: { filterReturnPending.toggle() }) {
            Label(
                filterReturnPending ? "全て表示" : "未返礼のみ",
                systemImage: filterReturnPending ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle"
            )
        }
    }

    // MARK: - Helpers

    private func deleteRecords(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(filtered[index])
        }
    }

    private func formatted(_ amount: Int) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "JPY"
        formatter.currencySymbol = "¥"
        return formatter.string(from: NSNumber(value: amount)) ?? "¥\(amount)"
    }
}

// MARK: - Row

struct RecordRow: View {
    let record: GiftRecord

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(record.giver)
                    .font(.headline)
                Spacer()
                Text(formattedAmount)
                    .font(.headline)
                    .foregroundStyle(.green)
            }
            HStack {
                Text(record.receivedItem.isEmpty ? "品物未入力" : record.receivedItem)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
                returnBadge
            }
            Text(formattedDate)
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 2)
    }

    private var returnBadge: some View {
        Group {
            if !record.hasReturn {
                Text("お返し不要")
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(.gray.opacity(0.2))
                    .clipShape(Capsule())
            } else if record.returnDone {
                Text("返礼済")
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(.blue.opacity(0.2))
                    .foregroundStyle(.blue)
                    .clipShape(Capsule())
            } else {
                Text("返礼未了")
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(.orange.opacity(0.2))
                    .foregroundStyle(.orange)
                    .clipShape(Capsule())
            }
        }
    }

    private var formattedAmount: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "JPY"
        formatter.currencySymbol = "¥"
        return formatter.string(from: NSNumber(value: record.amount)) ?? "¥\(record.amount)"
    }

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.locale = Locale(identifier: "ja_JP")
        return formatter.string(from: record.receivedDate)
    }
}
