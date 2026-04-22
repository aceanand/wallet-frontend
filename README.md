# Wallet Frontend

React frontend for the Departmental Expense Wallet System demonstrating concurrent transaction handling.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start
```

Access: http://localhost:3000

## 🏗️ Structure

```
src/
├── components/
│   └── App.jsx              # Main React component
├── styles/
│   ├── App.css              # Component styles
│   └── index.css            # Global styles
└── index.jsx                # React entry point
```

## 🎯 Features

- Department tabs with real-time balance
- Concurrent payment simulation
- Test results panel
- Transaction ledger
- Reset and clear functions

## 🔧 Configuration

Create a `.env` file in the root:
```
REACT_APP_API_URL=http://localhost:5001
```

## 📦 Technologies

- React 18
- CSS3 with animations
- Fetch API for backend communication

## 🌐 Backend

This frontend connects to: https://github.com/aceanand/wallet-backend
