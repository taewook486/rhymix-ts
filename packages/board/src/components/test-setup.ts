/**
 * Vitest setup for jsdom component tests.
 * Extends vitest's expect with @testing-library/jest-dom matchers.
 */
import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);
