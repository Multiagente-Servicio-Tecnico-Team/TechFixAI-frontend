import { useCallback, useEffect, useState } from "react";
import { useStore } from "../../state/store.jsx";
import { PART_CATEGORIES } from "../../domain/inventory.js";
import { inventoryApi } from "./inventoryApi.js";

const uniqueCategories = (values) => [...new Set(
  values.filter((value) => typeof value === "string" && value.trim()),
)];

/**
 * Inventario para las pantallas del taller: listar, crear, editar y eliminar repuestos.
 * En modo demostración trabaja sobre el estado en memoria; con la API, carga la lista del backend
 * y solo actualiza la pantalla cuando el servidor confirma cada cambio.
 */
export function useInventory(api = inventoryApi) {
  const { parts: storedParts, dispatch } = useStore();
  const live = api.mode === "api";
  const [status, setStatus] = useState(live ? "loading" : "ready");
  const [error, setError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [categories, setCategories] = useState(live ? [] : PART_CATEGORIES);
  const [loadedFromApi, setLoadedFromApi] = useState(false);

  const reload = useCallback(async () => {
    if (!live) return;
    setStatus("loading");
    try {
      const loadedParts = await api.list();
      dispatch({ type: "setParts", parts: loadedParts });
      setLoadedFromApi(true);
      setError("");
      try {
        const loadedCategories = typeof api.listCategories === "function"
          ? await api.listCategories()
          : loadedParts.map((part) => part.category);
        setCategories(uniqueCategories(loadedCategories));
        setCategoryError("");
      } catch (categoryLoadError) {
        setCategories(uniqueCategories(loadedParts.map((part) => part.category)));
        setCategoryError(categoryLoadError.message || "No se pudieron cargar todas las categorías.");
      }
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
    setCategories((current) => uniqueCategories([...current, saved.category]));
    return saved;
  }, [api, live, dispatch]);

  const remove = useCallback(async (sku) => {
    if (live) await api.remove(sku);
    dispatch({ type: "deletePart", sku });
    const remaining = storedParts.filter((part) => part.sku !== sku);
    if (live && typeof api.listCategories === "function") {
      try {
        setCategories(uniqueCategories(await api.listCategories()));
        setCategoryError("");
      } catch (categoryLoadError) {
        setCategories(uniqueCategories(remaining.map((part) => part.category)));
        setCategoryError(categoryLoadError.message || "No se pudieron cargar todas las categorías.");
      }
    } else {
      setCategories(uniqueCategories(remaining.map((part) => part.category)));
    }
  }, [api, live, dispatch, storedParts]);

  const parts = live && !loadedFromApi ? [] : storedParts;
  const visibleCategories = live
    ? categories
    : uniqueCategories([...categories, ...storedParts.map((part) => part.category)]);
  return { parts, categories: visibleCategories, status, error, categoryError, reload, save, remove, live };
}
