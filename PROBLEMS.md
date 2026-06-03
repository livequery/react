# PROBLEMS — @livequery/react

Ghi chú vấn đề + các sửa đổi tạm thời cần review/xử lý lại cho đúng.
Người ghi: phiên debug larkpanel admin-panel (login màn trắng / không redirect).

---

## 1. `useObservable` không xử lý được "observable proxy" của `@livequery/rpc`

### Triệu chứng thực tế
Trên larkpanel admin-panel:
- `useObservable(auth.accounts$)` trả về sai giá trị ở render đầu → màn hình trắng
  (`TypeError: Cannot read properties of undefined/null (reading 'current_account_id')`).
- Sau khi vá sơ bộ thì login được nhưng bị **đá ngược về /login** vì `account` luôn rỗng.

### Root cause (đã xác minh, KHÔNG nằm ở react mà ở rpc)
`auth.accounts$` KHÔNG phải `BehaviorSubject` thật. Nó là **Proxy bọc quanh một
callable** do `@livequery/rpc` `ServiceLinker.build()` tạo ra
(`fn = (...args) => rpc(paths, args)`), với trap `get` cho `pipe`/`subscribe`/`getValue`.

Hệ quả với `useObservable` (code GỐC):
1. `typeof o === 'function'` là `true` (vì proxy bọc callable) → `useObservable`
   tưởng `o` là **lazy factory** `() => source` → **gọi `o()`** → nhận về một
   Observable khác / mất `getValue` → state khởi tạo = `default_value` (caller
   không truyền ⇒ `undefined`) → consumer crash.
2. Proxy stream được tạo bằng `new BehaviorSubject(null)` ở rpc, nên **emit `null`**
   trước khi dữ liệu thật về từ SharedWorker. Code gốc `tap(s)` set thẳng `null`
   vào React state → consumer đọc `state.current_account_id` trên `null` → crash.

---

## 2. Sửa đổi TẠM THỜI đã áp dụng (cần review lại)

File: `src/useObservable.ts`. Đây là fix phòng thủ ở phía react, **không phải fix gốc**.

### a. Bỏ hẳn hỗ trợ "lazy factory" `() => source`
- Xoá type `MaybeFunction<T>` và nhánh `typeof o === 'function' ? o() : o`.
- `o` giờ luôn là source trực tiếp (BehaviorSubject | Observable | proxy).
- **Lý do:** không thể vừa nhận factory `() => source` vừa nhận proxy-callable một
  cách an toàn bằng heuristic `typeof === 'function'` — chúng không phân biệt được.
  Quyết định (theo chủ dự án): bỏ factory, luôn truyền source trực tiếp.
- **⚠️ Breaking change:** caller nào đang gọi `useObservable(() => someSubject)` sẽ
  hỏng. Cần grep toàn bộ codebase dùng `@livequery/react` trước khi release.

### b. Fallback default cho MỌI giá trị nullish (không chỉ giá trị khởi tạo)
- Thêm helper `withDefault(value) => value ?? default_value`, áp dụng cho cả
  `useState` initial lẫn mỗi lần `tap` emit.
- **Lý do:** proxy emit `null` lúc chưa có data → phải fallback default để consumer
  không bao giờ nhận null/undefined.
- **⚠️ Cân nhắc:** điều này khiến observable KHÔNG BAO GIỜ phát được giá trị
  `null`/`undefined` hợp lệ ra component (luôn bị thay bằng default). Nếu có
  use-case cần phân biệt "đã load nhưng giá trị là null" với "chưa load", cách này
  che mất. Có thể cần một cờ `loading` riêng thay vì nuốt null.

### c. Test
- `tests/hooks.test.tsx`: xoá test "resolves lazy observable sources" (tính năng đã
  bỏ), thêm nhóm "callable observable proxy (RPC)" gồm: không invoke proxy như
  factory, fallback default khi getValue() null, fallback khi proxy EMIT null,
  đọc đúng getValue() khi đã có data. 15/15 pass.

### d. Lưu ý: `TODO.md` đang STALE
Mục `[x]` trong `TODO.md` mô tả fix theo "hướng A: thêm `isObservableLike`" — đó là
hướng thử ĐẦU TIÊN, sau đó đã ĐỔI sang hướng "bỏ hẳn factory" (mục 2a ở trên).
Code hiện tại KHÔNG còn `isObservableLike`/`isFactory`. Cần cập nhật lại TODO.md cho khớp.

---

## 3. Hướng fix GỐC nên cân nhắc (ở `@livequery/rpc`, không phải react)

Vấn đề thật là **observable-property của service proxy lại là callable**. Nên sửa ở
`@livequery/rpc` `ServiceLinker.build()`:
- Làm observable-property KHÔNG callable — tách "gọi method" khỏi "lấy observable
  property" (vd: method trả thenable-observable, còn property `xxx$` trả Observable
  thuần không phải Proxy-callable).
- Hoặc gắn brand/Symbol để consumer phân biệt rõ "đây là observable" thay vì dựa
  `typeof === 'function'`.
- Xem xét lại việc seed `new BehaviorSubject(null)` — có thể dùng một sentinel
  "chưa có giá trị" thay vì `null` để consumer phân biệt được trạng thái loading.

Nếu fix được ở rpc, có thể đơn giản hoá lại `useObservable` (mục 2) và gỡ workaround
phía larkpanel (`useAccountContext` truyền default, `GoogleLogin` dùng
`firstValueFrom` chờ account trước khi navigate).

---

## 4. Workaround phía consumer (larkpanel admin-panel) — để tham chiếu
Không thuộc package này nhưng liên quan, ghi để agent sau biết còn chỗ cần dọn khi
fix gốc xong:
- `hooks/useAccountContext.ts`: `useObservable(auth.accounts$, { accounts: {}, current_account_id: undefined })` — truyền default.
- `app/[lang]/(auth)/login/GoogleLogin.tsx`: sau `auth.oidc.login()` dùng
  `firstValueFrom(auth.accounts$.pipe(filter(s => !!s?.current_account_id)))` để
  chờ account sync từ worker về main thread rồi mới `navigate`.
- Còn 1 bug riêng CHƯA fix: account không persist vào IndexedDB (login xong F5 là
  mất session) — cần điều tra `StorageBehaviorSubject` + `IndexedDBStorage` trong worker.
