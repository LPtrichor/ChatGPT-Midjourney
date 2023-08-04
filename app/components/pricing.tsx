import { useState, useEffect } from "react";
import Image from "next/image";
import QRCode from "qrcode.react";

import styles from "./pricing.module.scss";

import CloseIcon from "../icons/close.svg";
import {
  Input,
  List,
  DangerousListItem,
  ListItem,
  Modal,
  PasswordInput,
} from "./ui-lib";

import { IconButton } from "./button";
import { useAuthStore, useAccessStore, useWebsiteConfigStore } from "../store";

import Locale from "../locales";
import { Path } from "../constant";
import { ErrorBoundary } from "./error";
import { useNavigate } from "react-router-dom";
import { showToast } from "./ui-lib";
import { useRouter } from "next/navigation";

// const ADMIN_URL = "http://172.19.16.1";
// const ADMIN_URL = "https://www.admin.rovy.me";
// export const ADMIN_Default_URL = "https://www.admin.rovy.me";
export const ADMIN_Default_URL = "http://127.0.0.1";
export const ADMIN_URL = process.env.NEXT_PUBLIC_BASE_URL ?? ADMIN_Default_URL;

export let qr_code = "";
export let order_id = "";
export let pay_amount = 0;

export interface Package {
  id: number;
  state: number;
  calcType: string;
  calcTypeId: number;
  limit_draw: number;
  limit_send: number;
  advancedlimit_send: number;
  tokens: number;
  price: string;
  title: string;
  subTitle: string;
  uuid: string;
  top: number;
  days: string;
  end_time: number;
  pay_amount: string;
}
interface PackageResponse {
  code: number;
  message?: string;
  data: Package[];
}

export function Pricing() {
  const router = useRouter();
  const navigate = useNavigate();
  const authStore = useAuthStore();

  const { pricingPageTitle, pricingPageSubTitle } = useWebsiteConfigStore();

  const [packages, setPackages] = useState([] as Package[]);
  const [loading, setLoading] = useState(false);
  const [isTokenValid, setTokenValid] = useState("unknown");
  useEffect(() => {
    setLoading(true);
    // fetch("/api/package/onSales", {
    fetch(ADMIN_URL + "/api/get_vip_level", {
      method: "get",
      headers: {
        Authorization: "Bearer " + authStore.token,
      },
    })
      .then((res) => res.json())
      .then((res) => {
        const packagesResp = res as unknown as PackageResponse;
        if (Math.floor(packagesResp.code / 100) === 100) {
          setTokenValid("invalid");
        } else {
          setTokenValid("valid");
        }
        if (!packagesResp.data) {
          setPackages([]);
          return;
        }
        setPackages(
          packagesResp.data.map((pkg) => {
            pkg = { ...pkg };
            if (pkg.title && !pkg.title.includes("<")) {
              pkg.title = `<div style="font-size: 20px;">${pkg.title}</div>`;
            }
            if (!pkg.subTitle) {
              const prefix = {
                1: "总额",
                2: "每天",
                3: "每小时",
                4: "每3小时",
              }[2];
              // }[pkg.calcTypeId];
              pkg.subTitle =
                `<ul style="margin-top: 5px;padding-inline-start: 10px;">` +
                (pkg.tokens
                  ? `<li>${prefix} <span style="font-size: 18px;">${
                      pkg.tokens === -1 ? "无限" : pkg.tokens
                    }</span> tokens</li>`
                  : "") +
                (pkg.limit_send
                  ? `<li>${prefix} <span style="font-size: 18px;">${
                      pkg.limit_send === -1 ? "无限" : pkg.limit_send
                    }</span> 次基础聊天（GPT3.5）</li>`
                  : "") +
                (pkg.advancedlimit_send
                  ? `<li>${prefix} <span style="font-size: 18px;">${
                      pkg.advancedlimit_send === -1
                        ? "无限"
                        : pkg.advancedlimit_send
                    }</span> 次高级聊天（GPT4）</li>`
                  : "") +
                (pkg.limit_draw
                  ? `<li>${prefix} <span style="font-size: 18px;">${
                      pkg.limit_draw === -1 ? "无限" : pkg.limit_draw
                    }</span> 次AI绘画</li>`
                  : "") +
                `<li>有效期： <span style="font-size: 18px;">${pkg.end_time}</span> 天</li>` +
                `</ul>`;
            }
            return pkg;
          }),
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [authStore.token]);
  function handleClickBuy(pkg: Package) {
    console.log("buy pkg", pkg);
    setLoading(true);
    // fetch("/api/order", {
    //   method: "post",
    //   headers: {
    //     Authorization: "Bearer " + authStore.token,
    //     "Content-Type": "application/json",
    //   },

    //   body: JSON.stringify({
    //     packageUuid: pkg.uuid,
    //     count: 1,
    //   }),
    // })
    let pay_type = "";
    if (pkg.calcType == "vip") {
      pay_type = "vip";
    } else {
      pay_type = "charge";
    }
    console.log("[pay_type]", pay_type);
    fetch(ADMIN_URL + "/api/alipay", {
      method: "post",
      headers: {
        Authorization: "Bearer " + authStore.token,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        amount: parseFloat(pkg.pay_amount),
        type: pay_type,
        v_id: pkg.id,
        // uuid: pkg.id
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        console.log("resp.data", res.data);
        // const order = res.data;
        // if (res.code !== 0) {
        //   if (res.code === 11303) {
        //     showToast(Locale.PricingPage.TOO_FREQUENCILY);
        //   } else {
        //     const message = Locale.PricingPage.BuyFailedCause + res.message;
        //     showToast(message);
        //   }
        //   return;
        // }

        if (res.status == 200) {
          // router.push(`https://api.qrserver.com/v1/create-qr-code/?size=${qrCodeSize}x${qrCodeSize}&data=${encodeURIComponent(url)}` + '.png');
          // router.push('https://api.ltzf.cn/uploads/QRcode/wxpay/WX202307122218374309246824.png');
          // navigate(Path.Pay + "?uuid=" + order.uuid);
          const url = res.qr_code;
          const qrCodeSize = 200;
          const make_qr_code = `https://api.qrserver.com/v1/create-qr-code/?size=${qrCodeSize}x${qrCodeSize}&data=${encodeURIComponent(
            url,
          )}`;
          qr_code = make_qr_code;
          order_id = res.out_trade_no;
          pay_amount = parseFloat(pkg.pay_amount);
          navigate(Path.Pay);
        }

        //   if (order.state === 5) {
        //     // console.log(log.message?.url)
        //     // window.open(log.message?.url, "_blank");
        //     console.log("router.push", order.payUrl);
        //     if (order.payChannel === "xunhu") {
        //       router.push(order.payUrl);
        //     } else {
        //       navigate(Path.Pay + "?uuid=" + order.uuid);
        //     }
        //     //
        //   } else {
        //     const logs = JSON.parse(order.logs);
        //     // console.log('order.logs', logs)
        //     const log = logs[0];
        //     const message =
        //       Locale.PricingPage.BuyFailedCause +
        //       (log.message?.message || log.message);
        //     console.error(message);
        //     showToast(message);
        //   }
      })
      .finally(() => {
        setLoading(false);
      });
    // showToast(Locale.PricingPage.ConsultAdministrator);
  }
  const [amount, setAmount] = useState("");
  return (
    <ErrorBoundary>
      <div className="window-header">
        <div className="window-header-title">
          <div className="window-header-main-title">
            {pricingPageTitle || "购买套餐"}
          </div>
          <div className="window-header-sub-title">
            {pricingPageSubTitle || "畅享与AI聊天的乐趣"}
          </div>
        </div>
        <div className="window-actions">
          <div className="window-action-button">
            <IconButton
              icon={<CloseIcon />}
              onClick={() => navigate(Path.Home)}
              bordered
              title={Locale.PricingPage.Actions.Close}
            />
          </div>
        </div>
      </div>
      <div className={styles["pricing"]}>
        {loading ? (
          <div style={{ height: "100px", textAlign: "center" }}>
            {Locale.PricingPage.Loading}
          </div>
        ) : (
          <></>
        )}
        {!loading && isTokenValid === "invalid" && (
          <div style={{ height: "100px", textAlign: "center" }}>
            <a
              href="javascript:void(0)"
              onClick={() => {
                navigate(Path.Login);
              }}
            >
              {Locale.PricingPage.PleaseLogin}
            </a>
          </div>
        )}
        {!loading &&
        !(isTokenValid === "invalid") &&
        (!packages || packages.length === 0) ? (
          <div style={{ height: "100px", textAlign: "center" }}>
            {Locale.PricingPage.NoPackage}
          </div>
        ) : (
          <></>
        )}
        <List>
          <DangerousListItem
            title={`<span style="font-size: 20px;">AI币</span>`}
            subTitle={
              `<ul style="margin-top: 5px;padding-inline-start: 10px;">` +
              `<li><span style="font-size: 15px;">一次绘画消耗0.3AI币</span></li>` +
              `<li><span style="font-size: 15px;">一次聊天消耗0.05AI币</span></li>`
            }
          >
            <div style={{ minWidth: "100px" }}>
              {/* <div
                              style={{
                                margin: "10px",
                                fontSize: "24px",
                                textAlign: "center",
                              }}
                            >
                              ￥{50}
                            </div> */}
              <div
                style={{
                  marginBottom: "15px",
                  margin: "10px",
                  fontSize: "24px",
                  textAlign: "center",
                }}
              >
                <input
                  type="text"
                  placeholder="请输入充值金额"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ fontSize: "16px", fontWeight: "bold" }}
                />
                <IconButton
                  style={{ float: "right", marginBottom: "15px" }}
                  disabled={loading}
                  text={"购买AI币"}
                  type="primary"
                  block={true}
                  onClick={() => {
                    const myPackage: Package = {
                      id: 0,
                      state: 0,
                      calcType: "charge",
                      calcTypeId: 0,
                      limit_draw: 0,
                      limit_send: 0,
                      advancedlimit_send: 0,
                      tokens: 0,
                      price: amount,
                      title: "",
                      subTitle: "",
                      uuid: "",
                      top: 0,
                      days: "",
                      end_time: 0,
                      pay_amount: amount,
                    };
                    handleClickBuy(myPackage);
                  }}
                />
              </div>
            </div>
          </DangerousListItem>
        </List>
        {packages.map((item) => {
          return (
            <List key={item.uuid}>
              <DangerousListItem title={item.title} subTitle={item.subTitle}>
                <div style={{ minWidth: "100px" }}>
                  <div
                    style={{
                      margin: "10px",
                      fontSize: "24px",
                      textAlign: "center",
                    }}
                  >
                    ￥{item.pay_amount}
                  </div>
                  <div style={{ marginBottom: "15px" }}>
                    <IconButton
                      text={Locale.PricingPage.Actions.Buy}
                      type="primary"
                      block={true}
                      disabled={loading}
                      onClick={() => {
                        handleClickBuy(item);
                      }}
                    />
                  </div>
                </div>
              </DangerousListItem>
            </List>
          );
        })}
        {/* <List>
              <DangerousListItem title={'标题'} subTitle={'小标题'}>
                <div style={{ minWidth: "100px" }}>
                  <div
                    style={{
                      margin: "10px",
                      fontSize: "24px",
                      textAlign: "center",
                    }}
                  >
                    ￥{50}
                  </div>
                  <div style={{ marginBottom: "15px" }}>
                    <IconButton
                      text={Locale.PricingPage.Actions.Buy}
                      type="primary"
                      block={true}
                      disabled={loading}
                      onClick={() => {
                        const myPackage: Package = {
                          id: 0,
                          state: 0,
                          calcType: "",
                          calcTypeId: 0,
                          drawCount: 0,
                          chatCount: 0,
                          advancedChatCount: 0,
                          tokens: 0,
                          price: "",
                          title: "",
                          subTitle: "",
                          uuid: "",
                          top: 0,
                          days: "",
                          end_time: 0,
                          pay_amount: "50",
                        };
                        handleClickBuy(myPackage);
                      }}
                    />
                  </div>
                </div>
              </DangerousListItem>
            </List> */}

        {/* <List>
          <ListItem>
            <IconButton
              text={Locale.PricingPage.Actions.Order}
              block={true}
              type="second"
              onClick={() => {
                navigate(Path.Order);
              }}
            />
          </ListItem>
        </List> */}
      </div>
      {/* <div>
      <h1>My Component</h1>
      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=${qrCodeSize}x${qrCodeSize}&data=${encodeURIComponent(url)}`} alt="QR code" />
    </div> */}
    </ErrorBoundary>
  );
}
