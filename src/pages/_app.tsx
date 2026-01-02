import { useGetTheme } from "@/services/theme";
import "@/styles/globals.css";
import { NextPageWithLayout, queryClient, ToastProvider } from "@/utils";
import { ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { QueryClientProvider } from "@tanstack/react-query";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { AppProps } from "next/app";
import Head from "next/head";

dayjs.extend(localeData);
dayjs.extend(timezone);
dayjs.extend(utc);

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  const theme = useGetTheme();

  const getLayout = Component.getLayout ?? ((page) => page);

  const components = getLayout(<Component {...pageProps} />);

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>AI Stock Service</title>
        </Head>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <ThemeProvider theme={theme}>
            <ToastProvider>{components}</ToastProvider>
          </ThemeProvider>
        </LocalizationProvider>
      </QueryClientProvider>
    </>
  );
}
