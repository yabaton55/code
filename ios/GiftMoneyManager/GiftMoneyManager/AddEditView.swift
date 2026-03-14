import SwiftUI
import SwiftData

struct AddEditView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    // 既存レコードの編集か新規追加かを判別
    var record: GiftRecord?

    // フォームフィールド
    @State private var giver = ""
    @State private var receivedItem = ""
    @State private var receivedDate = Date()
    @State private var amountText = ""
    @State private var notes = ""
    @State private var hasReturn = true
    @State private var returnBudgetText = ""
    @State private var returnDone = false
    @State private var returnItem = ""
    @State private var hasReturnDate = false
    @State private var returnDate = Date()

    private var isEditing: Bool { record != nil }

    private var isFormValid: Bool {
        !giver.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                receivedSection
                returnSection
                notesSection
            }
            .navigationTitle(isEditing ? "編集" : "新規追加")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("キャンセル") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") { save() }
                        .disabled(!isFormValid)
                }
            }
            .onAppear { loadRecord() }
        }
    }

    // MARK: - Sections

    private var receivedSection: some View {
        Section("もらった情報") {
            LabeledContent("もらった人") {
                TextField("名前", text: $giver)
                    .multilineTextAlignment(.trailing)
            }

            LabeledContent("もらったもの") {
                TextField("品物・現金など", text: $receivedItem)
                    .multilineTextAlignment(.trailing)
            }

            DatePicker("時期", selection: $receivedDate, displayedComponents: .date)
                .environment(\.locale, Locale(identifier: "ja_JP"))

            LabeledContent("金額") {
                HStack {
                    Text("¥")
                    TextField("0", text: $amountText)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                }
            }
        }
    }

    private var returnSection: some View {
        Section("お返し情報") {
            Toggle("お返しする", isOn: $hasReturn)
                .onChange(of: hasReturn) { _, _ in
                    if !hasReturn { returnDone = false }
                }

            if hasReturn {
                LabeledContent("お返しの目安") {
                    HStack {
                        Text("¥")
                        TextField("金額の半額が目安", text: $returnBudgetText)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                    }
                }
                .onAppear { suggestReturnBudget() }

                LabeledContent("あげるもの") {
                    TextField("品物名", text: $returnItem)
                        .multilineTextAlignment(.trailing)
                }

                Toggle("返礼日を設定", isOn: $hasReturnDate)

                if hasReturnDate {
                    DatePicker("あげる時期", selection: $returnDate, displayedComponents: .date)
                        .environment(\.locale, Locale(identifier: "ja_JP"))
                }

                Toggle("お返し済み", isOn: $returnDone)
            }
        }
    }

    private var notesSection: some View {
        Section("備考") {
            TextField("メモ・コメントなど", text: $notes, axis: .vertical)
                .lineLimit(3...6)
        }
    }

    // MARK: - Logic

    private func suggestReturnBudget() {
        guard returnBudgetText.isEmpty, let amount = Int(amountText), amount > 0 else { return }
        returnBudgetText = "\(amount / 2)"
    }

    private func loadRecord() {
        guard let r = record else { return }
        giver = r.giver
        receivedItem = r.receivedItem
        receivedDate = r.receivedDate
        amountText = r.amount > 0 ? "\(r.amount)" : ""
        notes = r.notes
        hasReturn = r.hasReturn
        returnBudgetText = r.returnBudget > 0 ? "\(r.returnBudget)" : ""
        returnDone = r.returnDone
        returnItem = r.returnItem
        if let rd = r.returnDate {
            hasReturnDate = true
            returnDate = rd
        }
    }

    private func save() {
        let amount = Int(amountText) ?? 0
        let returnBudget = Int(returnBudgetText) ?? 0

        if let r = record {
            // 更新
            r.giver = giver.trimmingCharacters(in: .whitespaces)
            r.receivedItem = receivedItem
            r.receivedDate = receivedDate
            r.amount = amount
            r.notes = notes
            r.hasReturn = hasReturn
            r.returnBudget = returnBudget
            r.returnDone = returnDone
            r.returnItem = returnItem
            r.returnDate = hasReturn && hasReturnDate ? returnDate : nil
        } else {
            // 新規
            let newRecord = GiftRecord(
                giver: giver.trimmingCharacters(in: .whitespaces),
                receivedItem: receivedItem,
                receivedDate: receivedDate,
                amount: amount,
                notes: notes,
                hasReturn: hasReturn,
                returnBudget: returnBudget,
                returnDone: returnDone,
                returnItem: returnItem,
                returnDate: hasReturn && hasReturnDate ? returnDate : nil
            )
            modelContext.insert(newRecord)
        }

        dismiss()
    }
}
