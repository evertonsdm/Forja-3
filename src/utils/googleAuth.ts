import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App uniquely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Ask for full sheets edit capability
provider.addScope("https://www.googleapis.com/auth/spreadsheets");

// Keep access token in-memory only (security guideline)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize observer
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Start Popup Sign in flow
export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken || null;
    if (!accessToken) {
      throw new Error("Não foi possível extrair o Token de Acesso do Google APIs a partir da credencial.");
    }
    cachedAccessToken = accessToken;
    return { user: result.user, accessToken };
  } catch (error: any) {
    console.error("Erro na autenticação popup Google:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Sign Out
export const logoutFromGoogle = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Helper to fetch Spreadsheet structures dynamically by matching GIDs with sheet titles
export interface SpreadsheetMeta {
  sheets: {
    properties: {
      sheetId: number;
      title: string;
    };
  }[];
}

export const fetchSpreadsheetMetadata = async (
  spreadsheetId: string,
  accessToken: string
): Promise<SpreadsheetMeta> => {
  const url = `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google API: Falha ao obter metadados da planilha (${response.status}): ${errorBody}`);
  }

  return response.json();
};

export interface BatchUpdateRange {
  range: string;
  values: any[][];
}

// Low level sheets batchUpdate logic
export const updateGoogleSheetsValuesInBatch = async (
  spreadsheetId: string,
  accessToken: string,
  dataToUpdate: BatchUpdateRange[],
  rangesToClear: string[]
): Promise<any> => {
  // 1. Clears values on ranges to prevent trailing stale data
  if (rangesToClear.length > 0) {
    const clearUrl = `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values:batchClear`;
    const clearResponse = await fetch(clearUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ranges: rangesToClear,
      }),
    });

    if (!clearResponse.ok) {
      const errorBody = await clearResponse.text();
      console.warn("Falha não-bloqueante ao limpar áreas da planilha antiga:", errorBody);
    }
  }

  // 2. Performs batchUpdate
  const updateUrl = `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const updateResponse = await fetch(updateUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      valueInputOption: "USER_ENTERED",
      data: dataToUpdate,
    }),
  });

  if (!updateResponse.ok) {
    const errorBody = await updateResponse.text();
    throw new Error(`Google API Sheet Sync Error (${updateResponse.status}): ${errorBody}`);
  }

  return updateResponse.json();
};
