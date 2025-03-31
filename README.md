# OneBox Email Aggregator - Backend

## 📌 Project Overview

The backend of OneBox Email Aggregator is built using **Node.js** and **Express**. It supports real-time **IMAP synchronization**, **Elasticsearch-based search**, **AI-powered email categorization**, and **webhook integrations**.

## 🚀 Features

- **IMAP Synchronization**: Fetch emails in real-time
- **Elasticsearch Integration**: Advanced email search
- **AI Categorization**: Uses NLP to classify emails
- **Webhooks & Slack Integration**: Sends notifications
- **User Authentication**: Secure login & JWT-based auth

## 🛠️ Installation & Setup

### 1️⃣ Clone the Repository

```sh
git clone https://github.com/kushalkumar09/oneBoxEmailBackend.git
cd oneBoxEmailBackend
```

### 2️⃣ Install Dependencies

```sh
npm install
```

### 3️⃣ Setup Environment Variables

Create a `.env` file in the root directory and add:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/onebox
IMAP_HOST=imap.gmail.com
IMAP_USER=your-email@gmail.com
IMAP_PASSWORD=your-email-password
ELASTICSEARCH_URL=http://localhost:9200
JWT_SECRET=your_jwt_secret
```

### 4️⃣ Start the Server

```sh
npm run dev
```

The backend will be running at: [http://localhost:5000](http://localhost:5000)

### 5️⃣ Build for Production

```sh
npm run build
```

## 📂 Project Structure

```
📦 BackendOneBox
├── 📂 config         # Configuration files
├── 📂 controllers    # Business logic handlers
├── 📂 models         # Mongoose models
├── 📂 routes         # API routes
├── 📂 services       # IMAP, AI & Elasticsearch integrations
├── 📂 utils          # Utility functions
├── server.js        # Entry point
├── .gitignore       # Git ignore file
├── package.json     # Dependencies and scripts
├── README.md        # Project documentation
```

## 🤝 Contributing

Feel free to fork this repository, create a new branch, and submit a pull request!

## 🛠️ Technologies Used

- Node.js & Express.js
- MongoDB & Mongoose
- IMAP (email fetching)
- Elasticsearch
- JWT Authentication

## 📜 License

This project is licensed under the MIT License.
