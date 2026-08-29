# 🤖 Nxt AI Platform

A full-stack AI automation platform designed to help users create, manage, and execute AI-powered workflows through a modern web interface.

The platform combines a **Next.js frontend**, **Node.js/Express backend**, **Google Gemini AI integration**, **JWT authentication**, **Socket.IO real-time communication**, and workflow execution capabilities.

## 🚀 Live Demo

**Live Website:
*https://nxt-ai-platform-gvn7.onrender.com/*

*GitHub Repository*:
*https://github.com/abhishekabhi02079-web/Nxt-AI-Platform.git*

## 📌 Project Description

**Nxt AI Platform** is a full-stack web application developed as an AI automation platform.

Users can interact with the platform through a modern dashboard, manage workflows, execute automation tasks, and communicate with AI services.

The application follows a separated frontend/backend architecture:

```text
┌─────────────────────────────┐
│       Next.js Frontend      │
│        Client / UI          │
└──────────────┬──────────────┘
               │
               │ REST API
               │ Socket.IO
               ▼
┌─────────────────────────────┐
│      Node.js Backend        │
│       Express Server        │
└──────────────┬──────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
 Google Gemini      Database /
      AI            Queue System
```

---

## ✨ Features

### 🤖 AI Integration

* Google Gemini AI integration
* AI-powered interactions
* Backend-based AI processing
* Secure API-key handling

### 🔐 Authentication & Security

* User registration and login
* JWT-based authentication
* Protected API requests
* Secure server-side API keys
* Environment-variable based configuration

### ⚡ Real-Time Communication

* Socket.IO integration
* Real-time execution updates
* Execution progress streaming
* Real-time logs
* Node output events
* Notification events

### 🔄 Workflow Management

* Create and manage workflows
* Workflow builder
* Workflow execution
* Execution status tracking
* Execution history
* Real-time execution monitoring

### 📊 Dashboard

* Modern dashboard interface
* Workflow overview
* Execution monitoring
* Notifications
* Integrations management

### 🌐 Production Deployment

* Next.js production build
* Node.js backend deployment
* Render deployment
* Production environment configuration
* Frontend-to-backend API integration

### 📱 Responsive Design

* Responsive user interface
* Desktop and mobile support
* Modern component-based architecture

---

## 🛠️ Technologies Used

### Frontend

* **Next.js**
* **React**
* **JavaScript**
* **Axios**
* **Socket.IO Client**
* CSS / responsive UI

### Backend

* **Node.js**
* **Express.js**
* **JavaScript**
* **Socket.IO**
* **JWT**
* **Axios**

### AI

* **Google Gemini API**

### Database & Queue

* Database integration with an in-memory fallback
* BullMQ
* Redis support
* In-memory execution queue fallback

### Development & Deployment

* Git
* GitHub
* Render
* Antigravity IDE
* npm

---

## 📁 Project Structure

```text
Nxt-AI-Platform/
│
├── client/
│   ├── src/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── stores/
│   │   └── ...
│   ├── package.json
│   └── ...
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── services/
│   │   ├── queues/
│   │   └── server.js
│   ├── package.json
│   └── ...
│
├── .env.example
├── README.md
└── ...
```

---

# 💻 Installation & Setup

## 1. Clone the Repository

```bash
git clone https://github.com/abhishekabhi02079-web/Nxt-AI-Platform.git
```

Move into the project:

```bash
cd Nxt-AI-Platform
```

---

## 2. Install Backend Dependencies

```bash
cd server
npm install
```

---

## 3. Configure Backend Environment Variables

Create a `.env` file inside the `server` directory.

Example:

```env
NODE_ENV=development
PORT=5000

GEMINI_API_KEY=your_gemini_api_key_here

CLIENT_URL=http://localhost:3000
```

Add any additional variables required by the backend configuration.

> ⚠️ Never commit your `.env` file or API keys to GitHub.

---

## 4. Start the Backend

From the `server` directory:

```bash
npm start
```

The backend should run on:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

---

## 5. Install Frontend Dependencies

Open another terminal:

```bash
cd client
npm install
```

---

## 6. Configure Frontend Environment Variables

Create a `.env.local` file inside the `client` directory.

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

These variables tell the frontend where the backend API and Socket.IO server are located.

---

## 7. Start the Frontend

From the `client` directory:

```bash
npm run dev
```

The Next.js application will normally be available at:

```text
http://localhost:3000
```

---

# 🧪 API Health Check

The backend provides a health-check endpoint:

```text
GET /api/health
```

Example:

```text
http://localhost:5000/api/health
```

A successful response confirms that the API server is running.

Example response:

```json
{
  "status": "ok",
  "service": "Agentflow_AI API Server"
}
```

---

# 🚀 Production Deployment

The application is designed as two separately deployed services.

### Backend

```text
Platform: Render
Root Directory: server
Build Command: npm install
Start Command: npm start
```

### Frontend

```text
Platform: Render
Root Directory: client
Build Command: npm install && npm run build
Start Command: npm start
```

### Production Frontend Variables

```env
NEXT_PUBLIC_API_URL=https://YOUR-BACKEND-URL.onrender.com/api
NEXT_PUBLIC_SOCKET_URL=https://YOUR-BACKEND-URL.onrender.com
```

The Gemini API key remains on the backend and should **never** be exposed through `NEXT_PUBLIC_*` variables.

---

# 📸 Screenshots

Add screenshots of your deployed application here.

### 🏠 Home Page

![Home Page](screenshots/home.png)

### 📊 Dashboard

![Dashboard](screenshots/dashboard.png)

### 🤖 AI Feature

![AI Feature](screenshots/ai-feature.png)

### 🔄 Workflow Builder

![Workflow Builder](screenshots/workflow-builder.png)

### ⚡ Execution Monitoring

![Execution Monitoring](screenshots/execution.png)

> Create a `screenshots` folder in the repository and place your screenshots inside it using the filenames above.

---

# 🔒 Security

This project follows environment-variable based secret management.

* API keys are stored server-side.
* Gemini API credentials are not exposed to the frontend.
* JWT authentication is used for protected requests.
* `.env` files should not be committed to GitHub.
* Production secrets should be configured through the deployment platform's environment variables.

**Never publish API keys, passwords, JWT secrets, or encryption keys in the repository.**

---

# 📈 Performance

The frontend has been production-built successfully using Next.js.

The application is designed with:

* Responsive layouts
* Optimized API communication
* Centralized Axios configuration
* Real-time Socket.IO communication
* Production environment configuration

---

# 🎯 Future Improvements

Potential future enhancements include:

* Advanced workflow templates
* More AI model providers
* Drag-and-drop workflow builder improvements
* Persistent production database
* Advanced analytics
* Scheduled workflow execution
* More third-party integrations
* Role-based access control
* Improved AI agent orchestration

---

# 👨‍💻 Author

**Abhishek**

Robotics & Automation Engineering Student

This project was developed as part of an project portfolio to demonstrate full-stack web development, AI integration, API development, authentication, real-time communication, and cloud deployment.

---

## ⭐ Acknowledgements

* Next.js
* React
* Node.js
* Express.js
* Google Gemini
* Socket.IO
* Render
* GitHub

---

## 📄 License

This project is intended for educational and portfolio purposes.

Add an appropriate open-source license if you plan to distribute the project publicly.
