import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Balance, ProfileResponse } from "../api/users/[...path]/route";
import { StoreKey } from "../constant";

export interface ProfileStore {
  id: number;
  name: string;
  invite_code: string;
  limit_send: number;
  chat_count: number;
  fetchProfile: (token: string) => Promise<any>;
}

// let fetchState = 0; // 0 not fetch, 1 fetching, 2 done

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      id: 0,
      name: "",
      invite_code: "",
      limit_send: 0,
      chat_count: 0,

      async fetchProfile(token: string) {
        // console.log('token ', token)
        // return fetch("/api/users/profile", {
        return (
          fetch("http://127.0.0.1/api/get_user", {
            method: "get",
            headers: {
              Authorization: "Bearer " + token,
            },
            body: null,
          })
            .then((res) => res.json())
            // .then((res: ProfileResponse) => {
            .then((res) => {
              console.log("[Profile] got profile from server", res);
              const data = res.data;
              if (res.data) {
                set(() => ({
                  id: data.id,
                  name: data.name,
                  invite_code: data.invite_code,
                  limit_send: res.vip.limit_send,
                  chat_count: res.data.chat_count,
                }));
              } else {
                console.log("[Profile] set id = 0");
                set(() => ({
                  id: 0,
                  // balances: [],
                }));
              }
              return res;
            })
            .catch(() => {
              console.error("[Profile] failed to fetch profile");
            })
            .finally(() => {
              // fetchState = 2;
            })
        );
      },
    }),
    {
      name: StoreKey.Profile,
      version: 1,
    },
  ),
);