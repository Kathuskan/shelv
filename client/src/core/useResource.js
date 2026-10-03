import { useEffect, useState } from "react";
import api, { message } from "./api";
export default function useResource(url, interval = 0) {
  const [state, setState] = useState({
    url: null,
    data: null,
    error: "",
    loading: true,
  });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    const fetchData = () =>
      api
        .get(url)
        .then(({ data }) => {
          if (active) setState({ url, data, error: "", loading: false });
        })
        .catch((e) => {
          if (active)
            setState((old) => ({
              url,
              data: old.url === url ? old.data : null,
              error: message(e),
              loading: false,
            }));
        });
    fetchData();
    const timer = interval ? setInterval(fetchData, interval) : null;
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [url, version, interval]);
  const visible =
    state.url === url ? state : { data: null, error: "", loading: true };
  return { ...visible, reload: () => setVersion((n) => n + 1) };
}
