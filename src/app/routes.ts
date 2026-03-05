import { createBrowserRouter } from "react-router";
import LandingPage from "./screens/LandingPage";
import CreateRoom from "./screens/CreateRoom";
import JoinRoom from "./screens/JoinRoom";
import Lobby from "./screens/Lobby";
import GameScreen from "./screens/GameScreen";
import NotFound from "./screens/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/create",
    Component: CreateRoom,
  },
  {
    path: "/join",
    Component: JoinRoom,
  },
  {
    path: "/room/:roomCode",
    Component: JoinRoom,
  },
  {
    path: "/lobby/:roomCode",
    Component: Lobby,
  },
  {
    path: "/game/:roomCode",
    Component: GameScreen,
  },
  {
    path: "*",
    Component: NotFound,
  },
]);