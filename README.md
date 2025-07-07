# Todo List App

A cross-platform todo application built with React Native and Expo, featuring team collaboration, calendar integration, and real-time synchronization with Supabase.

## 🌟 Features

- **Cross-platform**: Works on iOS, Android, and Web
- **Team Collaboration**: Assign tasks to team members
- **Priority Management**: High, Medium, Low priority levels with visual indicators
- **Calendar Integration**: View tasks in weekly, 3-day, or daily calendar views
- **Drag & Drop**: Reorder tasks with intuitive gestures
- **Voice Input**: Add tasks using voice recognition
- **Real-time Sync**: All changes sync across devices using Supabase
- **Responsive Design**: Optimized for mobile and web

## 🚀 Live Demo

Visit the live web version: [Your GitHub Pages URL will appear here after deployment]

## 🛠️ Tech Stack

- **Frontend**: React Native, Expo
- **Backend**: Supabase (PostgreSQL + Real-time)
- **Navigation**: React Navigation
- **Calendar**: React Native Big Calendar
- **Gestures**: React Native Gesture Handler
- **Voice**: Expo Speech & Speech Recognition

## 📱 Screenshots

- **My Tasks**: Personal task management with drag & drop
- **Team View**: Collaborative task management
- **Calendar**: Visual task scheduling
- **Team Members**: Manage team assignments

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone [your-repo-url]
   cd todo-list-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL from `supabase_setup.sql` in your Supabase SQL editor
   - Update `supabaseClient.js` with your project URL and anon key

4. **Start the development server**
   ```bash
   # For mobile
   npm start
   
   # For web
   npm run web
   
   # For specific platforms
   npm run android
   npm run ios
   ```

## 🌐 Web Deployment

This app is automatically deployed to GitHub Pages using GitHub Actions. The deployment workflow:

1. Builds the app for web using `expo export --platform web`
2. Deploys the `dist` folder to GitHub Pages
3. Triggers on every push to main/master branch

### Manual Deployment

```bash
# Build for web
npx expo export --platform web

# The dist folder contains the web build
```

## 📊 Database Schema

The app uses the following Supabase tables:

- `todos`: Main task storage
- `team_members`: Team member management
- Real-time subscriptions for live updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Expo team for the amazing development platform
- Supabase for the backend infrastructure
- React Navigation for seamless navigation
- All the open-source contributors whose libraries made this possible

<!-- Trigger redeploy --> 