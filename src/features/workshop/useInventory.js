import { useCallback, useEffect, useState } from "react";
import { useStore } from "../../state/store.jsx";
import { inventoryApi } from "./inventoryApi.js";

/**
 * Inventario para las pantallas del taller: listar, crear, editar y eliminar repuestos.
 * En modo demostración trabaja sobre el estado en memoria; con la API, carga la lista del backend
 * y solo actualiza la pantalla cuando el servidor confirma cada cambio.
 */
export function useInventory(api = inventoryApi) {
  const { parts, dispatch } = useStore();
  const live = api.mode === "api";
  const [status, setStatus] = useState(live ? "loading" : "ready");
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!live) return;
    setStatus("loading");
    try {
      dispatch({ type: "setParts", parts: await api.list() });
      setError("");
      setStatus("ready");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }, [api, live, dispatch]);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(async (part, { editing }) => {
    const saved = !live ? part : editing ? await api.update(part) : await api.create(part);
    dispatch({ type: "savePart", part: saved });
    return saved;
  }, [api, live, dispatch]);

  const remove = useCallback(async (sku) => {
    if (live) await api.remove(sku);
    dispatch({ type: "deletePart", sku });
  }, [api, live, dispatch]);

  return { parts, status, error, reload, save, remove, live };
}
