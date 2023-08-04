import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NextImage from "next/image";
import AlipayLogo from "../icons/alipay-logo.png";

import styles from "./pay.module.scss";

import CloseIcon from "../icons/close.svg";
import { ErrorBoundary } from "./error";
import { useAuthStore, useWebsiteConfigStore } from "../store";

import { IconButton } from "./button";
import { Path } from "../constant";

import Locale from "../locales";
import { showToast } from "./ui-lib";

import { qr_code, order_id } from "./pricing";
import { pay_amount } from "./pricing";

// export const ADMIN_Default_URL = "https://www.admin.rovy.me";
const ADMIN_Default_URL = "http://127.0.0.1";
const ADMIN_URL = process.env.NEXT_PUBLIC_BASE_URL ?? ADMIN_Default_URL;

// import dotenv from "dotenv";
// dotenv.config();

export function Pay() {
  const navigate = useNavigate();
  const authStore = useAuthStore();

  const { payPageTitle, payPageSubTitle } = useWebsiteConfigStore();

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const orderUuid = params.get("uuid");
  const [order, setOrder] = useState(null as any);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(true);
  // const [error, setError] = useState(false)

  const [qrCode, setQrCode] = useState("");
  const [lastOrderState, setLastOrderState] = useState<number | null>(null);

  // useEffect(() => {
  //   let timer: NodeJS.Timeout;
  //   let timeout: NodeJS.Timeout;

  //   const startPolling = () => {
  //     timer = setInterval(() => {
  //       console.log("timer内部（pay.tsx）");
  //       fetch("https://www.admin.rovy.me" + "/api/alipay_return", {
  //         method: "post",
  //         headers: {
  //           Authorization: "Bearer " + authStore.token,
  //         },
  //         body: JSON.stringify({
  //           order_id: order_id,
  //         }),
  //       })
  //         .then((res) => res.json())
  //         .then((res) => {
  //           const order_status = res.status;
  //           console.log("order", order);
  //           setOrder(order);
  //           setLastOrderState(order.state);
  //           if (order_status === 1) {
  //             showToast(Locale.PayPage.PaidSuccess);
  //             navigate(Path.Balance);
  //             clearInterval(timer);
  //             clearTimeout(timeout);
  //           }
  //         });
  //     }, 5000);
  //   };

  //   const startTimeout = () => {
  //     timeout = setTimeout(() => {
  //       clearInterval(timer);
  //       showToast("支付超时，请重新支付");
  //       navigate(Path.Home);
  //     }, 300000);
  //   };

  //   startPolling();
  //   startTimeout();

  //   return () => {
  //     clearInterval(timer);
  //     clearTimeout(timeout);
  //   };
  // }, []);

  useEffect(() => {
    let count = 0;
    console.log("测试useEffect状态函数作用（pay.tsx）");
    const timer = setInterval(() => {
      console.log("timer内部（pay.tsx）");
      count++;
      // 若用户三分钟没有付款，则停止轮询
      if (count == 180) {
        showToast("付款超时，请重新购买");
        navigate(Path.Pricing);
        clearInterval(timer);
      }
      // console.log(`Timer count: ${count}`);
      console.log("[env(pay.tsx)]", process.env.NEXT_PUBLIC_BASE_URL);
      fetch(ADMIN_URL + "/api/alipay_return", {
        method: "post",
        headers: {
          // Authorization: "Bearer " + authStore.token,
          // "User-Agent": "PostmanRuntime-ApipostRuntime/1.1.0",
          Connection: "keep-alive",
          "Content-Type": "application/json", // 添加 Content-Type 头部
        },
        body: JSON.stringify({
          order_id: order_id,
        }),
      })
        .then((res) => res.json())
        .then((res) => {
          const order_status = res.status;
          // console.log("order", order);
          // setOrder(order);
          // setLastOrderState(order.state);
          if (order_status === 1) {
            showToast(Locale.PayPage.PaidSuccess);
            navigate(Path.Home);
            clearInterval(timer);
          }
          // if (order.state === 5) {
          //   setQrCode(order.payUrl);
          //   setPaying(true);
          // } else {
          //   setPaying(false);
          // }
          // console.log("Timer stopped");
        });
    }, 1000);
    setQrCode(qr_code);
    // const startTimeout = () => {
    //   timeout = setTimeout(() => {
    //     clearInterval(timer);
    //     showToast("支付超时，请重新支付");
    //     navigate(Path.Home);
    //   }, 300000);
    // };
    return () => {
      // console.log("clearInterval");
      clearInterval(timer);
    };
    // console.log("测试useEffect状态函数作用", count);
    // return () => clearInterval(timer);
  }, []);

  // useEffect(() => {
  //   setLoading(true);
  //   fetch("/api/order/" + orderUuid, {
  //     method: "get",
  //     headers: {
  //       Authorization: "Bearer " + authStore.token,
  //     },
  //   })
  //     .then((res) => res.json())
  //     .then((res) => {
  //       const order = res.data;
  //       console.log("order", order);
  //       setOrder(order);
  //       setLastOrderState(order.state);
  //       if (order.state === 5) {
  //         setQrCode(order.payUrl);
  //         setPaying(true);
  //       } else {
  //         setPaying(false);
  //       }
  //     })
  //     .finally(() => {
  //       setLoading(false);
  //     });
  // }, []);

  // useEffect(() => {
  //   const timer = setInterval(() => {
  //     // console.log('qrCode', qrCode)
  //     if (!qrCode) {
  //       return;
  //     }
  //     fetch("/api/order/" + orderUuid, {
  //       method: "get",
  //       headers: {
  //         Authorization: "Bearer " + authStore.token,
  //       },
  //     })
  //       .then((res) => res.json())
  //       .then((res) => {
  //         const order = res.data;
  //         console.log("order.state", order.state);
  //         setOrder(order);
  //         if (lastOrderState === 5 && order.state === 10) {
  //           showToast(Locale.PayPage.PaidSuccess);
  //           navigate(Path.Balance);
  //         }
  //         if (order.state != 5) {
  //           setPaying(false);
  //           clearInterval(timer);
  //         } else {
  //           setPaying(false);
  //         }
  //         setLastOrderState(order.state);
  //       });
  //   }, 1200);

  //   return () => {
  //     console.log("clearInterval");
  //     clearInterval(timer);
  //   };
  // }, [qrCode]);

  return (
    <ErrorBoundary>
      <div className="window-header">
        <div className="window-header-title">
          <div className="window-header-main-title">
            {payPageTitle || "订单支付"}
          </div>
          <div className="window-header-sub-title">{payPageSubTitle || ""}</div>
        </div>
        <div className="window-actions">
          <div className="window-action-button">
            <IconButton
              icon={<CloseIcon />}
              onClick={() => navigate(Path.Home)}
              bordered
              title={Locale.PayPage.Actions.Close}
            />
          </div>
        </div>
      </div>
      <div className={styles["pay"]}>
        <div className={styles["container"]}>
          <NextImage
            src={AlipayLogo.src}
            width={280}
            height={70}
            alt="wechat-pay"
          />
          <div style={{ marginTop: "10px" }}>
            {order ? order.title : "套餐购买"}
          </div>
          <div style={{ lineHeight: "50px" }}>
            <span style={{ fontSize: "32px" }}>￥</span>
            <span style={{ fontSize: "32px" }}>{pay_amount}</span>
            {/* ￥<span style={{ fontSize: "32px" }}>{order && order.price}</span> */}
          </div>
          {qrCode && <img src={qrCode} width={230} height={230} alt="qrcode" />}
          {loading && (
            <div
              style={{
                width: "230px",
                height: "230px",
                backgroundColor: "#f0f0f0",
                lineHeight: "230px",
                textAlign: "center",
              }}
            >
              Loading
            </div>
          )}
          <div className={styles["bottom"]}>请使用支付宝扫码支付</div>
        </div>

        {order && (
          <div style={{ textAlign: "center", margin: "20px" }}>
            当前订单：
            {order.state === 0
              ? "未提交"
              : order.state === 5
              ? order.payUrl
                ? "待支付"
                : "已超时"
              : order.state === 6
              ? "提交失败"
              : order.state === 10
              ? "已支付"
              : order.state === 12
              ? "支付失败"
              : order.state === 20
              ? "已取消"
              : order.state === 30
              ? "已删除"
              : ""}
          </div>
        )}

        <div className={styles["buttons"]}>
          <div style={{ marginBottom: "10px" }}>
            <IconButton
              text={Locale.Profile.Actions.Pricing}
              block={true}
              type="second"
              onClick={() => {
                navigate(Path.Pricing);
              }}
            />
          </div>
          <div>
            <IconButton
              text={Locale.PricingPage.Actions.Order}
              block={true}
              type="second"
              onClick={() => {
                navigate(Path.Order);
              }}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
