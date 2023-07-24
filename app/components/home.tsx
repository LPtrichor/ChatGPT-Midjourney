"use client";

require("../polyfill");

import { useState, useEffect, use } from "react";

import NextImage from "next/image";

import styles from "./home.module.scss";

import BotIcon from "../icons/bot.svg";
import ChatBotIcon from "../icons/ai-chat-bot.png";
import LoadingIcon from "../icons/three-dots.svg";

import { getCSSVar, useMobileScreen } from "../utils";

import dynamic from "next/dynamic";
import { Path, SlotID } from "../constant";
import { ErrorBoundary } from "./error";

import {
  HashRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { SideBar } from "./sidebar";
import { useAppConfig } from "../store/config";
import { useWebsiteConfigStore, useAuthStore, BOT_HELLO } from "../store";
import { AuthPage } from "./auth";
// import { Register } from "./register";

// export function Loading(props: { noLogo?: boolean }) {
//   return (
//     <div className={styles["loading-content"] + " no-dark"}>
//       {!props.noLogo && <BotIcon />}
//       <LoadingIcon />
//     </div>
//   );
// }

export function Loading(props: {
  noLogo?: boolean;
  logoLoading: boolean;
  logoUrl?: string;
}) {
  const logoLoading = props.logoLoading;
  const logoUrl = props.logoUrl;
  const noLogo = props.noLogo;
  console.log("Loading logoUrl", noLogo, logoUrl);
  return (
    <div className={styles["loading-content"] + " no-dark"}>
      {!props.noLogo && (
        <NextImage
          src={ChatBotIcon.src}
          width={30}
          height={30}
          alt="bot"
          className="user-avatar"
        />
      )}
      <LoadingIcon />
    </div>
  );
}

//支付相关
const Pricing = dynamic(async () => (await import("./pricing")).Pricing, {
  loading: () => <Loading noLogo logoLoading />,
});

const Pay = dynamic(async () => (await import("./pay")).Pay, {
  loading: () => <Loading noLogo logoLoading />,
});

const Order = dynamic(async () => (await import("./order")).Order, {
  loading: () => <Loading noLogo logoLoading />,
});

const Login = dynamic(async () => (await import("./login")).Login, {
  loading: () => <Loading noLogo logoLoading />,
});

const Register = dynamic(async () => (await import("./register")).Register, {
  loading: () => <Loading noLogo logoLoading />,
});

const Profile = dynamic(async () => (await import("./profile")).Profile, {
  loading: () => <Loading noLogo logoLoading />,
});
// const Profile = dynamic(async () => (await import("./profile")).Profile, {
//   loading: () => <Loading noLogo logoLoading />,
// });

const Settings = dynamic(async () => (await import("./settings")).Settings, {
  loading: () => <Loading noLogo logoLoading />,
});

const Chat = dynamic(async () => (await import("./chat")).Chat, {
  loading: () => <Loading noLogo logoLoading />,
});

const NewChat = dynamic(async () => (await import("./new-chat")).NewChat, {
  loading: () => <Loading noLogo logoLoading />,
});

const MaskPage = dynamic(async () => (await import("./mask")).MaskPage, {
  loading: () => <Loading noLogo logoLoading />,
});

export function useSwitchTheme() {
  const config = useAppConfig();

  useEffect(() => {
    document.body.classList.remove("light");
    document.body.classList.remove("dark");

    if (config.theme === "dark") {
      document.body.classList.add("dark");
    } else if (config.theme === "light") {
      document.body.classList.add("light");
    }

    const metaDescriptionDark = document.querySelector(
      'meta[name="theme-color"][media*="dark"]',
    );
    const metaDescriptionLight = document.querySelector(
      'meta[name="theme-color"][media*="light"]',
    );

    if (config.theme === "auto") {
      metaDescriptionDark?.setAttribute("content", "#151515");
      metaDescriptionLight?.setAttribute("content", "#fafafa");
    } else {
      const themeColor = getCSSVar("--theme-color");
      metaDescriptionDark?.setAttribute("content", themeColor);
      metaDescriptionLight?.setAttribute("content", themeColor);
    }
  }, [config.theme]);
}

const useHasHydrated = () => {
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  return hasHydrated;
};

const loadAsyncGoogleFont = () => {
  const linkEl = document.createElement("link");
  linkEl.rel = "stylesheet";
  linkEl.href =
    "/google-fonts/css2?family=Noto+Sans+SC:wght@300;400;700;900&display=swap";
  document.head.appendChild(linkEl);
};

function Screen() {
  const config = useAppConfig();
  const location = useLocation();
  const isHome = location.pathname === Path.Home;
  const isMobileScreen = useMobileScreen();
  // const isAuth = location.pathname === Path.Auth;
  const isAuth = false;
  useEffect(() => {
    loadAsyncGoogleFont();
  }, []);

  return (
    <div
      className={
        styles.container +
        ` ${
          config.tightBorder && !isMobileScreen
            ? styles["tight-container"]
            : styles.container
        }`
      }
    >
      {isAuth ? (
        <>
          <AuthPage />
        </>
      ) : (
        <>
          <SideBar className={isHome ? styles["sidebar-show"] : ""} />

          <div className={styles["window-content"]} id={SlotID.AppBody}>
            <Routes>
              <Route path={Path.Home} element={<Chat />} />
              <Route path={Path.NewChat} element={<NewChat />} />
              <Route path={Path.Masks} element={<MaskPage />} />
              <Route path={Path.Chat} element={<Chat />} />
              <Route path={Path.Settings} element={<Settings />} />
              <Route path={Path.Login} element={<Login />} />
              <Route path={Path.Register} element={<Register />} />
              <Route path={Path.Profile} element={<Profile />} />
              <Route path={Path.Pricing} element={<Pricing />} />
              <Route path={Path.Pay} element={<Pay />} />
              <Route path={Path.Order} element={<Order />} />
            </Routes>
          </div>
        </>
      )}
    </div>
  );
}

export function Home() {
  useSwitchTheme();

  const [logoLoading, setLogoLoading] = useState(false);
  const { fetchWebsiteConfig, logoUrl } = useWebsiteConfigStore();

  if (!useHasHydrated()) {
    return (
      <Loading noLogo={false} logoLoading={logoLoading} logoUrl={logoUrl} />
    );
    // return <Loading />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <Screen />
      </Router>
    </ErrorBoundary>
  );
}
