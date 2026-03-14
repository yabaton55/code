import Foundation
import SwiftData

@Model
final class GiftRecord {
    var giver: String           // もらった人
    var receivedItem: String    // もらったもの
    var receivedDate: Date      // 時期
    var amount: Int             // 金額
    var notes: String           // 備考
    var hasReturn: Bool         // お返しの有無
    var returnBudget: Int       // お返しの目安
    var returnDone: Bool        // お返し済みかどうか
    var returnItem: String      // あげるもの
    var returnDate: Date?       // あげる時期

    init(
        giver: String = "",
        receivedItem: String = "",
        receivedDate: Date = Date(),
        amount: Int = 0,
        notes: String = "",
        hasReturn: Bool = true,
        returnBudget: Int = 0,
        returnDone: Bool = false,
        returnItem: String = "",
        returnDate: Date? = nil
    ) {
        self.giver = giver
        self.receivedItem = receivedItem
        self.receivedDate = receivedDate
        self.amount = amount
        self.notes = notes
        self.hasReturn = hasReturn
        self.returnBudget = returnBudget
        self.returnDone = returnDone
        self.returnItem = returnItem
        self.returnDate = returnDate
    }

    /// お返しの目安を金額の半額で自動計算
    func suggestedReturnBudget() -> Int {
        return amount / 2
    }
}
