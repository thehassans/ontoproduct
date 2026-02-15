# Shopify Integration Guide

## Overview
This guide explains how to connect your Shopify store to your BuySial Management Panel. This integration allows you to:
1.  **Sync Products:** Push your "In-house Products" to your Shopify store.
2.  **Sync Orders:** Automatically receive orders from Shopify into your Management Panel.

## Step 1: Create a Custom App in Shopify
To allow BuySial to communicate with your Shopify store, you need to create a "Custom App" in your Shopify Admin.

1.  Log in to your **Shopify Admin** panel (e.g., `yourstore.myshopify.com/admin`).
2.  Go to **Settings** (bottom left) → **Apps and sales channels**.
3.  Click **Develop apps** (top right).
4.  If this is your first time, click **Allow custom app development**.
5.  Click **Create an app**.
    *   **App name:** "BuySial Integration"
    *   **App developer:** Select your email.
    *   Click **Create app**.

## Step 2: Configure API Scopes
1.  In the app configuration screen, click **Configure Admin API scopes**.
2.  Search for and check the boxes for the following permissions (Read and Write):
    *   `read_products`, `write_products`
    *   `read_orders`, `write_orders`
    *   `read_fulfillments`, `write_fulfillments`
    *   `read_inventory`, `write_inventory`
    *   `read_locations`, `read_merchant_managed_fulfillment_orders`, `write_merchant_managed_fulfillment_orders`
3.  Click **Save** (top right).

## Step 3: Get Access Token
1.  Go to the **API credentials** tab.
2.  Click **Install app** (top right) → **Install**.
3.  Under **Admin API access token**, click **Reveal token once**.
4.  **COPY THIS TOKEN IMMEDIATELY.** It starts with `shpat_`. You will not be able to see it again. this is your **Shopify Access Token**.
5.  Also copy your **API key** and **API secret key** just in case, but usually, only the Access Token is needed for this integration.
6.  The **Shopify Store URL** is simply the domain you see in your browser, e.g., `your-store-name.myshopify.com`.

## Step 4: Configure Webhooks (For Real-time Orders)
For orders to appear instantly in your panel, you need to tell Shopify to send them to us.

1.  Stay in your Shopify Admin → Settings → **Notifications**.
2.  Scroll down to the **Webhooks** section at the bottom.
3.  Click **Create webhook**.
4.  **Event:** Select `Order creation`.
5.  **Format:** `JSON`.
6.  **URL:** `https://buysial.com/api/shopify/webhooks/orders/create`
7.  **Webhook API version:** Select the latest (e.g., `2024-01`).
8.  Click **Save**.
9.  Scroll down to find the **Webhook signing secret**. It is a string like `whsec_...` at the bottom of the Webhooks section. **COPY THIS.** This is your **Webhook Secret**.

*Repeat for Order Cancellation (Optional but recommended):*
*   **Event:** `Order cancellation`
*   **URL:** `https://buysial.com/api/shopify/webhooks/orders/cancelled`

## Step 5: Connect in Management Panel
1.  Log in to your **BuySial Management Panel** as Admin/User.
2.  Go to the **Commerce** section in the sidebar → click **Shopify Integration**.
3.  Enter the details you copied:
    *   **Shopify Store:** `your-store.myshopify.com`
    *   **Shopify Access Token:** `shpat_xxxxxxxxxxxxxxxxxxxx`
    *   **Webhook Secret:** `whsec_xxxxxxxxxxxxxxxxxxxx` (if you want secure verification)
    *   **API Version:** `2024-01` (or whatever you selected)
4.  Click **Save Settings**.

## Step 6: Syncing
1.  **Sync Products:** In the Shopify Integration page, you will see a list of products marked for Shopify. Click **Sync All Products** to push them to Shopify.
    *   *Note:* To mark a product for Shopify, go to "Create Product" (Inhouse Products), edit a product, and enable "Show on Shopify".
2.  **View Orders:** When a customer places an order on your Shopify store, it will automatically appear in your **Orders** page within a few seconds, labeled as "Shopify Order".

## Summary of Checklist
- [ ] Created Custom App in Shopify
- [ ] Configured API Scopes (Products, Orders, Inventory)
- [ ] Installed App and got `shpat_` Access Token
- [ ] Created Webhook for `Order creation` pointing to `https://buysial.com/api/shopify/webhooks/orders/create`
- [ ] Entered credentials in Management Panel
