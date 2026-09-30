import {defineConfig} from '@playwright/test';
import base from './playwright.config';
// Explicit opt-in LOGIN_E2E=1 creates real test accounts. Never intercept Auth/REST.
export default defineConfig({...base,webServer:undefined,testMatch:'login-live.spec.ts',outputDir:'artifacts/published-test-results',use:{...base.use,baseURL:'https://flot-sector.netlify.app',trace:'off',video:'off'}});
