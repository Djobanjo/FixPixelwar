# PROJECT PIXEL WARS (little format)
*Made by Jules DEBRECZENI in the **Python de la Fournaise** ([insta](https://www.instagram.com/pythondelafournaise/))association* 

# Pixel War – Setup and Deployment

![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![GitHub Repo Size](https://img.shields.io/github/repo-size/Djobanjo/FixPixelwar)
![License](https://img.shields.io/github/license/Djobanjo/FixPixelwar)
![Firebase](https://img.shields.io/badge/Firebase-Connected-orange)

### Precondition

Before starting, make sure you have installed:

- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- A **GitHub account**
- A **Firebase account** for the real-time database (Realtime Database or Firestore)
- A hosting service for the backend, like [Render.com](https://render.com)

---

### Installation Steps

1. **Clone the project**
```bash
git clone https://github.com/USERNAME/REPO_NAME.git
cd REPO_NAME
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Firebase**
- Create a project on [Firebase Console](https://console.firebase.google.com/)
- Enable **Realtime Database** 
- Get the Firebase configuration (`apiKey`, `authDomain`, `databaseURL`, etc.)
- Replace the variables in `firebaseConfig.js` or `.env`

4. **Deploy the backend**
- Create an account on [Render.com](https://render.com) or another Node.js hosting service
- Link your GitHub account to Render
- Deploy your GitHub repository as a **Web Service**
- Set environment variables for Firebase (`API_KEY`, `AUTH_DOMAIN`, etc.)

---

## Run locally

To test your project locally:
```bash
npm run dev
```
Open your browser at `http://localhost:3000` to see the app in action.

---
