# Comprehensive API List - VITALBLAZE Commerce

> [!TIP]
> This document serves as the ultimate reference for the VITALBLAZE Backend API. All endpoints are prefixed with `/api`.

## 🛠 Global Configuration

| Setting | Value | Description |
| :--- | :--- | :--- |
| **Base URL** | `https://web.buysial.com/api` | Production Endpoint |
| **Dev URL** | `http://localhost:4000/api` | Local Development |
| **Auth Header** | `Authorization: Bearer <token>` | JWT Token required for protected routes |
| **Content-Type** | `application/json` | Standard request/response format |

---

## 🔐 Authentication Module (`/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/login` | Public | Login with `email`, `password`, `loginType`. Returns JWT. |
| `POST` | `/register` | Public | Customer registration. Details: `firstName`, `lastName`, `email`, `password`. |
| `POST` | `/register-investor` | Public | Investor self-signup with `referralCode`. |
| `POST` | `/seed-admin` | Public (Dev) | Creates an initial Admin user if none exists. |

---

## 👥 User Management (`/users`)

Manage the hierarchy of Admins, Managers, Agents, and Drivers.

### **Agents**
<details>
<summary>Click to view Agent Endpoints</summary>

- **`POST /agents`**: Create a new Agent.
    - **Body**: `firstName`, `lastName`, `email`, `phone`, `password`.
    - **Note**: Triggers WhatsApp welcome message.
- **`GET /agents`**: List Agents (Scoped to Workspace).
- **`GET /agents/performance`**: Get metrics (assigned chats, orders done).
- **`PATCH /agents/:id`**: Update Agent details.
- **`POST /agents/:id/resend-welcome`**: Resend login credentials via WhatsApp.
</details>

### **Drivers**
<details>
<summary>Click to view Driver Endpoints</summary>

- **`GET /drivers`**: List Drivers.
    - **Query**: `?country=UAE` (Filters by region).
- **`GET /drivers/:id/orders`**: Get orders assigned to a specific driver.
</details>

### **Profile**
- **`GET /me`**: Get current user's full profile (includes `driverProfile` commission stats).
- **`PATCH /me/password`**: Change password.
- **`PATCH /me/availability`**: Set status (`available`, `busy`, `away`).

---

## 📦 Product & Inventory (`/products`)

Managing the catalog and multi-country stock.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | List all products (Scoped: User sees their own). |
| `GET` | `/public` | Public catalog for website (filters: `category`, `search`, `sort`). |
| `GET` | `/mobile` | Optimized catalog for Mobile App. |
| `POST` | `/` | **Create Product**. Supports image upload. Params: `name`, `price`, `stockUAE`, `stockKSA`... |
| `GET` | `/:id` | Get single product details. |
| `PATCH` | `/:id` | Update product (Price, Stock, Images). |
| `DELETE` | `/:id` | Remove a product (Hard delete). |
| `POST` | `/:id/stock/add` | Add stock quantity (Log history). |
| `POST` | `/:id/images/ai` | **AI Gen**: Generate product images using prompt. |
| `POST` | `/generate-description` | **AI Gen**: Create description via Gemini. |

---

## 📝 Order Management (`/orders`)

The core transaction engine.

### **Create Order** (`POST /`)
High-validation endpoint for submitting orders.
```json
{
  "customerPhone": "+971501234567",
  "customerName": "John Doe",
  "city": "Dubai",
  "orderCountry": "UAE",
  "items": [
    { "productId": "64f...", "quantity": 2 }
  ],
  "locationLat": 25.2048,
  "locationLng": 55.2708
}
```
> [!WARNING]
> Requires `locationLat`/`locationLng` (from WhatsApp pin) and validates that the **Country Code** matches the **Location Coordinate Country**.

### **Order Operations**
- **`GET /`**: List orders (Pagination, Filtering by Status/Date).
- **`GET /:id`**: Get full order details.
- **`PATCH /:id/status`**: Update status (e.g., `pending` -> `shipped`).
- **`PATCH /:id/assign`**: Assign to Driver (`deliveryBoy`).
- **`PATCH /:id/cancel`**: Cancel order (Restores stock).

---

## 🏭 Warehouse & Analytics (`/warehouse`)

For high-level stock and financial visibility.

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/summary` | `GET` | **Aggregated Report**: Returns products with: <br>• `stockLeft` (by country)<br>• `delivered` (qty)<br>• `deliveredRevenue` (money)<br>• `potentialRevenue` |

---

## 💸 Finance & Remittances (`/finance`)

Handling cash flow between Drivers and Company.

- **`POST /remittances`**: Driver submits cash collection.
- **`GET /remittances`**: List requests (Pending/Accepted).
- **`PATCH /remittances/:id/status`**: Manager approves/rejects remittance.
- **`GET /stats`**: Global financial overview (Revenue, Profit, Expenses).

---

## 📡 Integrations

### **WhatsApp (`/wa`)**
*Optional module, toggled via `ENABLE_WA` env var.*
- **`GET /status`**: Check connection status.
- **`POST /send`**: Send manual message.
- **`GET /qr`**: Get pairing QR code.

### **Shopify (`/shopify`)**
- **`POST /sync`**: Pull products from Shopify store.
- **`POST /push`**: Push inventory updates to Shopify.

---

## 📊 Error Handling

Standard error response format:
```json
{
  "message": "Human-readable error description",
  "error": "ERROR_CODE_STRING",
  "details": { ...context }
}
```

> [!NOTE]
> **Common Error Codes**:
> - `INSUFFICIENT_STOCK`: Requested quantity exceeds available country stock.
> - `COUNTRY_MISMATCH`: Phone number code doesn't match delivery country.
> - `LOCATION_COUNTRY_MISMATCH`: GPS coordinates are outside the target country.
