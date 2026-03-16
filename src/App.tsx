/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Matchmaking from './pages/Matchmaking';
import Sessions from './pages/Sessions';
import Profile from './pages/Profile';
import SessionWorkspace from './pages/SessionWorkspace';
import StudySquads from './pages/StudySquads';
import Messages from './pages/Messages';
import LiveMeet from './pages/LiveMeet';
import LiveMeetLobby from './pages/LiveMeetLobby';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="matchmaking" element={<Matchmaking />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="squads" element={<StudySquads />} />
        <Route path="messages" element={<Messages />} />
        <Route path="meet" element={<LiveMeetLobby />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      {/* Workspace and Meet are outside the main layout to give them full screen */}
      <Route path="/workspace/:sessionId" element={<SessionWorkspace />} />
      <Route path="/meet/:roomId" element={<LiveMeet />} />
    </Routes>
  );
}
