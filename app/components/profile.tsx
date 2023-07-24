import { useState, useEffect } from "react";

import styles from "./profile.module.scss";

import CloseIcon from "../icons/close.svg";
import { Input, List, ListItem, Modal, PasswordInput } from "./ui-lib";

import { copyToClipboard } from "../utils";

import { IconButton } from "./button";
import {
  useAuthStore,
  useAccessStore,
  useAppConfig,
  useProfileStore,
} from "../store";

import Locale from "../locales";
import { Path } from "../constant";
import { ErrorBoundary } from "./error";
import { useNavigate } from "react-router-dom";
import { showToast, Popover } from "./ui-lib";
import { Avatar, AvatarPicker } from "./emoji";
import { Balance } from "../api/users/[...path]/route";

export function Profile() {
  const navigate = useNavigate();
  const authStore = useAuthStore();
  const accessStore = useAccessStore();
  const profileStore = useProfileStore();

  const config = useAppConfig();
  const updateConfig = config.update;

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const keydownEvent = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        navigate(Path.Home);
      }
    };
    document.addEventListener("keydown", keydownEvent);
    return () => {
      document.removeEventListener("keydown", keydownEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { fetchProfile } = profileStore;
  useEffect(() => {
    setLoading(true);
    fetchProfile(authStore.token)
      .then((res) => {
        if (!res.data || !res.data.id) {
          authStore.logout();
          navigate(Path.Login);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fetchProfile, authStore, navigate]);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  function logout() {
    setTimeout(() => {
      authStore.logout();
      navigate(Path.Login);
    }, 500);
  }

  function getPrefix(balance: Balance) {
    return balance.calcType == "Total"
      ? "剩余"
      : balance.calcType == "Daily"
      ? Locale.Profile.BalanceItem.CalcTypes.Daily
      : balance.calcType == "Hourly"
      ? Locale.Profile.BalanceItem.CalcTypes.Hourly
      : balance.calcType == "ThreeHourly"
      ? Locale.Profile.BalanceItem.CalcTypes.ThreeHourly
      : "";
  }

  return (
    <ErrorBoundary>
      <div className="window-header">
        <div className="window-header-title">
          <div className="window-header-main-title">{Locale.Profile.Title}</div>
          <div className="window-header-sub-title">
            {/* {Locale.Profile.SubTitle} */}
          </div>
        </div>
        <div className="window-actions">
          <div className="window-action-button">
            <IconButton
              icon={<CloseIcon />}
              onClick={() => navigate(Path.Home)}
              bordered
              title={Locale.Profile.Actions.Close}
            />
          </div>
        </div>
      </div>
      <div className={styles["profile"]}>
        <List>
          <ListItem title={Locale.Settings.Avatar}>
            <Popover
              onClose={() => setShowEmojiPicker(false)}
              content={
                <AvatarPicker
                  onEmojiClick={(avatar: string) => {
                    updateConfig((config) => (config.avatar = avatar));
                    setShowEmojiPicker(false);
                  }}
                />
              }
              open={showEmojiPicker}
            >
              <div
                className={styles.avatar}
                onClick={() => setShowEmojiPicker(true)}
              >
                <Avatar avatar={config.avatar} />
              </div>
            </Popover>
          </ListItem>

          <ListItem title={"昵称"}>
            <span>{profileStore.name}</span>
          </ListItem>
        </List>
        <List>
          <ListItem title={"邀请码"}>
            <>
              <span>
                <span style={{ fontWeight: "bold" }}>
                  {profileStore.invite_code}
                </span>
                <span
                  className={styles["copy-action"]}
                  onClick={() => {
                    copyToClipboard(profileStore.invite_code);
                  }}
                >
                  {"  复制"}
                </span>
              </span>
            </>
          </ListItem>
        </List>
        <List>
          <ListItem title={"AI币"}>
            <span>{profileStore.money}</span>
          </ListItem>
          <ListItem title={"会员级别"}>
            <span>{profileStore.vip_level}</span>
          </ListItem>
          <ListItem title={"会员到期时间"}>
            <span>{profileStore.vip_expire_time}</span>
          </ListItem>
        </List>
        <List>
          <ListItem title={"每日已使用次数(MJ绘画)"}>
            <span>{profileStore.draw_count}</span>
          </ListItem>
          <ListItem title={"每日可使用总次数(MJ绘画)"}>
            <span>{profileStore.limit_draw}</span>
          </ListItem>
        </List>
        <List>
          <ListItem title={"每日已使用次数(GTP3.5)"}>
            <span>{profileStore.chat_count}</span>
          </ListItem>
          <ListItem title={"每日可使用总次数(GPT3.5)"}>
            <span>{profileStore.limit_send}</span>
          </ListItem>
        </List>
        {/* <List></List> */}

        {/* <List>
          {loading ||
          (profileStore.balances && profileStore.balances.length === 0) ? (
            <div
              style={{
                borderBottom: "var(--border-in-light)",
                minHeight: "40px",
                lineHeight: "40px",
                padding: "10px 20px",
                textAlign: "center",
              }}
            >
              {loading
                ? "加载中"
                : profileStore.balances && profileStore.balances.length === 0
                ? "您尚未购买任何套餐"
                : ""}
            </div>
          ) : (
            <></>
          )}

          {profileStore.balances &&
          profileStore.balances.length > 0 &&
          !profileStore.balances[0].expired ? (
            <>
              <ListItem
                title={Locale.Profile.Tokens.Title}
                subTitle={
                  getPrefix(profileStore.balances[0]) +
                  Locale.Profile.Tokens.SubTitle
                }
              >
                <span>
                  {profileStore.balances[0].tokens == -1
                    ? "无限"
                    : profileStore.balances[0].tokens}
                </span>
              </ListItem>

              <ListItem
                title={Locale.Profile.ChatCount.Title}
                subTitle={
                  getPrefix(profileStore.balances[0]) +
                  Locale.Profile.ChatCount.SubTitle
                }
              >
                <span>
                  {profileStore.balances[0].chatCount == -1
                    ? "无限"
                    : profileStore.balances[0].chatCount}
                </span>
              </ListItem>

              <ListItem
                title={Locale.Profile.AdvanceChatCount.Title}
                subTitle={
                  getPrefix(profileStore.balances[0]) +
                  Locale.Profile.AdvanceChatCount.SubTitle
                }
              >
                <span>
                  {profileStore.balances[0].advancedChatCount == -1
                    ? "无限"
                    : profileStore.balances[0].advancedChatCount}
                </span>
              </ListItem>
              <ListItem
                title={Locale.Profile.DrawCount.Title}
                subTitle={
                  getPrefix(profileStore.balances[0]) +
                  Locale.Profile.DrawCount.SubTitle
                }
              >
                <span>
                  {profileStore.balances[0].drawCount == -1
                    ? "无限"
                    : profileStore.balances[0].drawCount}
                </span>
              </ListItem>
              <ListItem
                title={Locale.Profile.ExpireList.Title}
                subTitle={Locale.Profile.ExpireList.SubTitle}
              >
                <span>{profileStore.balances[0].expireTime}</span>
              </ListItem>
            </>
          ) : (
            <></>
          )}
          {profileStore.balances && profileStore.balances.length > 0 ? (
            <ListItem
              subTitle={
                profileStore.balances[0].expired
                  ? "您所购套餐已经全部过期"
                  : "以上仅展示最早到期的套餐"
              }
            >
              <IconButton
                text={Locale.Profile.Actions.All}
                type="second"
                style={{ flexShrink: 0 }}
                onClick={() => {
                  // showToast(Locale.Profile.Actions.ConsultAdministrator);
                  navigate(Path.Balance);
                }}
              />
            </ListItem>
          ) : (
            <></>
          )}
        </List> */}

        <List>
          {/* <ListItem>
            <IconButton
              text={Locale.Profile.Actions.Pricing}
              block={true}
              type="primary"
              onClick={() => {
                navigate(Path.Pricing);
              }}
            />
          </ListItem> */}

          {/* <ListItem>
            <IconButton
              text={Locale.Profile.Actions.Order}
              block={true}
              type="second"
              onClick={() => {
                navigate(Path.Order);
              }}
            />
          </ListItem> */}

          <ListItem>
            <IconButton
              text={Locale.LoginPage.Actions.Logout}
              block={true}
              onClick={() => {
                logout();
              }}
            />
          </ListItem>
        </List>
      </div>
    </ErrorBoundary>
  );
}
