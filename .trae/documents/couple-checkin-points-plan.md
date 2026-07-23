# 情侣签到 & 积分模块实施计划

## Context

为提升用户日活与互动趣味性，在 SweetLove 应用中新增「每日签到 + 积分 + 积分商城 + 券」模块。该模块涉及数据库模型、后端 API、前端页面、现有页面集成以及测试，改动面较大，需要先统一方案再执行。

## 推荐方案

采用「用户独立签到、独立积分池」的设计：
- 双方各自签到，各自累计连续天数与积分
- 积分可在情侣间转账
- 双方共同维护一个「积分商城」（卡券模板），各自用积分购买/兑换券
- 券归购买者/受赠者个人所有，可继续使用或赠送给对方

## 数据库设计

在 `prisma/schema.prisma` 新增以下模型，并同步更新 `sql/init.sql`：

| 模型 | 用途 |
|------|------|
| `CheckIn` | 每日签到记录，含日期、连续天数、本次获得积分 |
| `PointBalance` | 每对情侣中每个用户的积分余额汇总 |
| `PointTransaction` | 积分流水（签到、转账、购买、获赠等） |
| `CouponTemplate` | 积分商城卡券模板（预设 + 情侣自定义） |
| `UserCoupon` | 用户实际拥有的券及状态 |
| `CouplePointSettings` | 每对情侣的积分规则（基础分、是否提醒签到） |

关键约束：
- `CheckIn` 按 `(userId, coupleId, date)` 唯一，防止重复签到
- `PointBalance` 按 `(userId, coupleId)` 唯一
- 删除用户/情侣时级联清理

## 后端 API

全部挂载在 `/api` 下，复用 `authenticate` 中间件，逻辑写在 `src/server/routes.ts`（与现有模块保持一致）。

### 签到
- `GET /checkins/status` — 今日签到状态、连续天数、历史签到日期列表
- `POST /checkins` — 执行签到，计算连续天数与积分，写入流水

### 积分
- `GET /points/overview` — 双方余额、各自连续天数、今日收入
- `GET /points/transactions` — 当前用户积分流水
- `POST /points/transfer` — 转账给伴侣（原子事务）

### 积分商城（卡券模板）
- `GET /points/store` — 当前情侣的模板列表
- `POST /points/store` — 创建自定义模板
- `PATCH /points/store/:id` — 编辑自定义模板
- `DELETE /points/store/:id` — 删除自定义模板
- `POST /points/store/:id/buy` — 购买券，扣积分并生成 `UserCoupon`

### 我的券
- `GET /points/coupons` — 我拥有的券（含未使用/已使用/已过期）
- `POST /points/coupons/:id/send` — 赠送给伴侣
- `POST /points/coupons/:id/use` — 使用券

### 设置
- `GET /points/settings`
- `PATCH /points/settings` — 修改基础分、签到提醒开关

## 前端实现

### 新增类型（`src/types.ts`）
新增 `CheckInStatus`、`PointOverview`、`PointTransaction`、`CouponTemplate`、`UserCoupon` 等类型，并在 `PageType` 追加 `'checkin'`。

### 新增 API 服务（`src/services/api.ts`）
新增 `checkInService`、`pointService`、`couponService`，风格与现有 `todoService` / `messageService` 一致。

### 新增页面与组件

| 文件 | 说明 |
|------|------|
| `src/pages/CheckIn.tsx` | 签到主页面：日历、连续天数、双方积分速览 |
| `src/components/checkin/CheckInCalendar.tsx` | 月历组件，标记已签到日期 |
| `src/components/points/PointOverview.tsx` | 双方积分余额卡片 |
| `src/components/points/TransferModal.tsx` | 积分转账弹窗 |
| `src/components/points/StoreModal.tsx` | 积分商城弹窗 |
| `src/components/points/CouponWallet.tsx` | 我的券分类展示 |
| `src/components/points/PointHistory.tsx` | 积分流水 |

### 集成到现有架构（`src/App.tsx`）
- 导入 `CheckIn` 页面
- `HASH_ROUTABLE_PAGES` 追加 `'checkin'`
- 全局状态新增 `checkInStatus`、`pointOverview`
- 初始数据拉取追加签到与积分概览
- 添加 `usePolling(refreshCheckIn)` 与 `usePolling(refreshPoints)` 保证实时同步
- 桌面侧边栏与移动端底部导航新增「签到」入口

### 留言板集成（`src/pages/MessageBoard.tsx`）
在留言板工具栏新增「积分转账」和「我的券」入口，点击后弹出对应弹窗。

## 关键业务逻辑

### 连续签到计算
- 查找昨天是否有签到记录
- 有则 `consecutiveDays = yesterday.consecutiveDays + 1`
- 无则 `consecutiveDays = 1`
- 本次获得积分 = `consecutiveDays × baseScore`
- 同一天重复签到返回 400

### 转账原子性
使用 Prisma `$transaction`：
1. 校验发送方余额
2. 发送方余额/总支出扣减
3. 接收方余额/总收入增加
4. 双方各写一条流水（`transfer_out` / `transfer_in`）

### 券状态流转
- 购买后状态 `unused`，按 `expiryDays` 计算过期时间
- 赠送变更 `ownerId`，状态保持 `unused`
- 使用后状态变为 `used`
- 过期采用懒更新：查询时扫描 `expiresAt < now` 的券并标记为 `expired`

## 测试策略

项目目前没有测试框架，需先引入 **Vitest**。

### 单元测试
- `tests/checkin.test.ts` — 连续天数、断签、重复签到、积分公式
- `tests/points.test.ts` — 转账余额校验、原子性、流水生成
- `tests/coupons.test.ts` — 购买扣积分、赠送变更 owner、使用/过期状态

### 集成/场景测试
- 用户 A 连续签到 3 天，第 4 天获得 `4 × baseScore` 积分
- A 转账 50 积分给 B，双方余额与流水正确
- A 购买「按摩券」后赠送给 B，B 可使用
- 断签后重新签到，连续天数从 1 开始

### 运行方式
- `npm test` 运行单元测试
- `npm run build` 验证前后端 TypeScript 编译

## 实施顺序

1. **Schema 与迁移**：修改 `prisma/schema.prisma`，生成迁移，同步 `sql/init.sql`
2. **后端签到 API**：实现签到状态查询与签到接口
3. **后端积分 API**：实现余额、流水、转账接口
4. **后端商城/券 API**：实现模板 CRUD、购买、赠送、使用接口
5. **前端类型与服务**：扩展 `src/types.ts` 与 `src/services/api.ts`
6. **签到页面**：新建 `CheckIn.tsx` 及日历组件，注册到 App.tsx
7. **积分/券 UI**：实现转账、商城、券包弹窗
8. **留言板集成**：在 `MessageBoard.tsx` 添加入口
9. **测试**：配置 Vitest，编写单元与场景测试
10. **数据备份**：在隐私安全的导出/导入中追加签到、积分、券数据

## Critical Files

- `prisma/schema.prisma`
- `sql/init.sql`
- `src/server/routes.ts`
- `src/App.tsx`
- `src/types.ts`
- `src/services/api.ts`
- `src/pages/CheckIn.tsx`（新建）
- `src/pages/MessageBoard.tsx`
- `package.json`（新增测试脚本与依赖）

## 实施状态

| 步骤 | 状态 | 说明 |
|------|------|------|
| Schema 与迁移 | ✅ | `prisma/schema.prisma` 与 `sql/init.sql` 已新增 6 个模型 |
| 后端签到 API | ✅ | `GET /checkins/status`、`POST /checkins` 已实现 |
| 后端积分 API | ✅ | 余额、流水、转账接口已实现，转账使用原子事务 |
| 后端商城/券 API | ✅ | 模板 CRUD、购买、赠送、使用接口已实现 |
| 前端类型与服务 | ✅ | `src/types.ts`、`src/services/api.ts` 已扩展 |
| 签到页面 | ✅ | `src/pages/CheckIn.tsx` 及日历组件已上线 |
| 积分/券 UI | ✅ | 转账、商城、券包、流水弹窗已实现 |
| 留言板集成 | ✅ | `MessageBoard.tsx` 已添加入口 |
| 测试 | ✅ | Vitest 已配置，新增 19 个单元测试 |
| 数据备份 | ✅ | 隐私导出/导入已包含签到、积分、券数据 |

## 测试报告

### 测试框架

- 框架：Vitest v4.1.10
- 配置：`vitest.config.ts`（jsdom 环境）
- 运行命令：`npm test`

### 测试覆盖

`tests/couplePoints.test.ts` 当前覆盖：

1. **日期工具**
   - `todayDate()` 返回午夜时间
   - `addDays()` 正确加减天数、跨月处理

2. **连续签到计算**
   - 空数组返回 0
   - 单天返回 1
   - 连续 4 天返回 4
   - 乱序日期正确排序后计算
   - 跨间隔取最长连续段
   - 同一天不重复计数

3. **积分计算**
   - `consecutiveDays × baseScore` 公式正确
   - 对非法输入（0、负数）做最小值兜底

4. **转账校验**
   - 余额充足时允许转账
   - 余额不足返回「积分不足」
   - 非正整数金额返回「转账积分必须为正整数」

5. **券状态解析**
   - 未过期券保持 `unused`
   - 过期券标记为 `expired`
   - 已使用券保持 `used`
   - 存在 `usedAt` 即视为 `used`
   - 无过期时间永不过期

### 运行结果

```text
Test Files  1 passed (1)
     Tests  19 passed (19)
```

## 验证方式

- 运行 `npm run build` 通过前后端编译
- 运行 `npm test` 通过新增单元测试
- 手动测试完整流程：签到 → 查看积分 → 转账 → 创建商城商品 → 购买券 → 赠送券 → 使用券
