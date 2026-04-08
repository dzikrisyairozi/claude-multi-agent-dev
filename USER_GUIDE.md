# User Guide: Approval Request Management

Welcome to the Approval Request Management system. This guide provides detailed instructions on how to use the application effectively, grouped by user role.

---

## 1. Login

Before accessing the system, you must authenticate. You can log in using your email and password or via Google.

> [!NOTE]
> If your account is marked as **Inactive**, you will be automatically redirected to an **Inactive Account** page upon logging in. You will not be able to access the dashboard. Please contact an administrator to reactivate your account.

### 1.1 Email & Password Login

1.  **Access the Application**: Navigate to the application URL in your web browser.
2.  **Enter Credentials**:
    - **Email**: Enter your company email address.
    - **Password**: Enter your secure password.
3.  **Submit**: Click the **"Sign In"** button.
4.  **Successful Login**: Upon success, you will be redirected to the **Dashboard**.

### 1.2 Google Login

1.  **Access the Application**: Navigate to the application URL in your web browser.
2.  **Choose Google Login**: Click the **"Continue with Google"** button.
3.  **Authenticate**: Select your Google account and grant necessary permissions if prompted.
4.  **Successful Login**: Upon success, you will be redirected to the **Dashboard**.

---

## 2. Employee Guide

As an **Employee**, your primary actions are creating requests, tracking their status, and managing your submissions.

### 2.1 Dashboard Overview

The **Dashboard** is your central hub. Here you can:

- **View Recent Requests**: See a list of your submissions sorted by date.
- **Track Status**: Quickly check if requests are Pending, Approved, or Rejected.
- **Quick Actions**: Use the **"New Submission"** button ( <kbd>+</kbd> icon ) to start a request.

### 2.2 Creating a New Request (Manual Form)

Use the standard form for structured data entry.

1.  **Start**: Click the **"New Submission"** ( <kbd>+</kbd> ) button on the Dashboard.
2.  **Fill the Form**:
    - **Basic Info**:
      - _Category_: Choose Purchasing, Contract, Expense, or Other.
      - _Title_: A short, descriptive name (e.g., "Q3 Marketing Software").
      - _Priority_: Select Low, Medium, High, or Critical.
      - _Department_: Your department name.
    - **Items**: Click **"Add Item"** to list details (Name, Qty, Price).
    - **Tax (Purchasing Only)**: Enable tax calculation if needed (inclusive/exclusive rates).
    - **Vendor Info**: Enter Vendor Name, Payment Schedule, and Payment Method.
    - **Justification**: Provide the "Reason for Purchase" and "Purpose".
    - **Attachments**: Upload relevant files (max 5MB each).
3.  **Submit**: Click **"Submit"** to send the request for approval.

### 2.3 Creating a Request (AI Assistant)

You can use the AI Chat for a faster, conversational experience, especially when you have supporting documents like invoices or quotes.

1.  **Open Chat**: Click the chat icon (bottom right) or navigate to the "Assistant" tab.
2.  **Upload File & Prompt**:
    - Click the attachment icon to **upload a file** (PDF, Image, etc.).
    - Enter a prompt such as: _"Create an approval request from this file"_.
3.  **AI Extraction & Validation**:
    - The AI will automatically **extract data** (Vendor, Items, Total Amount) from the document.
    - It will validate the information and ask for any missing fields.
4.  **Confirm**: Review the created draft and **confirm** to proceed with the submission.

### 2.4 Managing Requests

- **View Details**: Click "View Details" on any request card to see the timeline, approver comments, and full item breakdown.
- **Edit Request**:
  - You can edit requests **only while they are in "Pending" status**.
  - Click the **Edit** button on the card or detail page, update fields, and save.
- **Search & Filter**:
  - Use the search bar for keywords (Title, Vendor).
  - Use filters for Status (Pending, Approved), Category, or Date Range.

---

## 3. Manager Guide

As a **Manager**, your primary role is to review and act on approval requests submitted by employees.

### 3.1 Dashboard & Notifications

- **Pending Approvals**: Your dashboard prominently displays requests waiting for your action.
- **Status Indicators**: Requests are color-coded (Yellow for Pending, Green for Approved, Red for Rejected).

### 3.2 Reviewing & Taking Action

You can approve or reject requests from three different locations:

#### Method A: Directly from Dashboard

1.  Locate a **Pending** request card.
2.  Review the key details (Amount, Title, Requestor).
3.  Click **Approve** (Green) or **Reject** (Red) directly on the card.

#### Method B: Request Detail Page

For a deep dive before deciding:

1.  Click **"View Details"** on a request.
2.  Review all tabs: Items, Justification, and Attachments.
3.  Use the **Action Bar** at the top of the detail view to **Approve** or **Reject**.

#### Method C: AI Assistant

1.  Ask the AI: _"Show me pending approvals"_.
2.  The AI will list requests requiring your attention.
3.  Click the **Approve** or **Reject** buttons displayed within the chat interface.

### 3.3 Post-Action

- **Approved**: The request moves to the next step (e.g., Finance or Finalization).
- **Rejected**: The requestor is notified, and the workflow ends.

---

## 4. Superadmin Guide

As a **Superadmin**, you have full control over user management, including inviting, editing, and managing user access.

### 4.1 Invite User

To add a new user to the system:

1.  **Navigate to Users**: Go to the **Users** management page.
2.  **Initiate Invite**: Click the **"Invite User"** button.
3.  **Fill Details**: Enter the user's details (Email, Role, etc.).
4.  **Send**: Click **Send Invite**. The user will receive an email with login instructions.

### 4.2 Update User Information

To modify an existing user's details:

1.  **Select User**: Locate the user in the user list.
2.  **Edit**: Click the **Edit** (pencil) icon or click on the user's name.
3.  **Modify**: Update the necessary fields (Name, Department, Role).
4.  **Save**: Click **Save Changes**.

### 4.3 Activate or Deactivate User

You can manage user access by activating or deactivating their accounts.

#### Method A: From Pending Users List

You can quickly activate users who are pending approval or in a pending state.

1.  **Go to Pending List**: Navigate to the **Pending Users** tab/list.
2.  **Find User**: Locate the user you wish to activate.
3.  **Action**: Click the **Approve** or **Activate** action.

#### Method B: From User Details

You can change the status of any user from their update page.

1.  **Access User Profile**: Navigate to the **Update User Information** page (as described in 4.2).
2.  **Locate Status**: Find the **Is Active** toggle or status setting.
3.  **Toggle Status**: Switch the status to **Active** or **Inactive**.
    - **Active**: User can log in and access the system.
    - **Inactive**: User will be redirected to the "Inactive Account" page upon login.
