# TODO

## Bugs

- [~] `useObservable`: duck typing (`typeof source.getValue === 'function'`) — GIỮ CÓ CHỦ ĐÍCH. KHÔNG đổi sang `instanceof BehaviorSubject`: proxy RPC không phải instance thật nhưng có `getValue`; dùng `instanceof` sẽ phá. `isObservableLike` (có `pipe`/`subscribe`) là thứ phân biệt proxy-source vs lazy factory.
- [x] `useObservable`: lazy factory — RE-ADDED với ngữ nghĩa single-subscription: `() => observable` được resolve **một lần** qua `useRef` (subscribe đúng 1 lần kể cả khi caller truyền arrow mới mỗi render); function CÓ `pipe`/`subscribe` (proxy RPC) vẫn được coi là source trực tiếp. Loading vẫn trả `default_value`/`undefined`. Test: `tests/hooks.test.tsx` mục "lazy factory".
- [x] `useObservable`: **first-render crash với observable proxy của `@livequery/rpc`** — FIXED.
      Root cause (đã xác minh, KHÁC giả định duck-typing ban đầu): remote observable từ
      `ServiceLinker.build()` là **Proxy bọc quanh callable** (`fn = (...args) => rpc(...)`),
      nên `typeof source === 'function'` → `useObservable` tưởng lazy factory và **gọi `o()`**,
      biến nó thành Observable thường không có `getValue` → state init = `default_value`
      (caller không truyền = `undefined`) → consumer crash `Cannot read properties of undefined`.
      Ca thật (larkpanel admin-panel): `useObservable(auth.accounts$)` → `undefined` render đầu
      → `accounts.current_account_id` ném `TypeError` → màn hình trắng.
      Fix (hướng A): thêm `isObservableLike` — function CÓ `pipe`/`subscribe` là source trực tiếp
      (KHÔNG gọi như factory); chỉ function thuần mới là factory. Kèm `getValue() ?? default_value`
      để proxy BehaviorSubject trả null pre-emission cũng fallback đúng.
      Test: `tests/hooks.test.tsx` mục "callable observable proxy (RPC)".

## Missing features

- [ ] `useDocument`: expose `error` state — hiện tại component không biết tại sao loading failed
- [ ] `useAction`: `code` đang hardcode là `'error'` — cần phân biệt validation error vs network error vs server error
- [~] `useCollection`: khi **ref đổi** → tạo collection MỚI (`useMemo` deps `[client, ref]`), state reset + reload đúng (đã có test). Options cũng được refresh tại thời điểm ref đổi. CÒN LẠI: options đổi **mà ref giữ nguyên** vẫn bị bỏ qua (chưa reactive theo filters) — cân nhắc thêm key ổn định vào deps hoặc dev-warn.

## Tests

- [x] `useCollection`: tests/useCollection.test.tsx — init, falsy refs, ref switching (instance mới + reload + teardown ref cũ), same-ref stability, cleanup on unmount (11 test).
- [ ] `useDocument`: test tuple unpacking, test khi collection có error
- [x] `useObservable`: tests/useObservable.test.tsx — đầy đủ RB/RO/PB/PO + with/without default, factory single-subscription, source switching, lifecycle (41 test).
- [ ] `useAction`: test error normalization, test onError callback
- [ ] `useLivequeryClient`: test throw khi dùng ngoài provider
