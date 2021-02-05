// Copyright 2018-2021 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import FormData from 'form-data';
import { gzip } from 'zlib';
import pify from 'pify';
import got from 'got';
import { getUserAgent } from '../util/getUserAgent';

const BASE_URL = 'https://debuglogs.org';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && !Array.isArray(value) && Boolean(value);

const parseTokenBody = (
  body: unknown
): { fields: Record<string, unknown>; url: string } => {
  if (!isObject(body)) {
    throw new Error('Token body is not an object');
  }

  const { fields, url } = body as Record<string, unknown>;

  if (!isObject(fields)) {
    throw new Error('Token body\'s "fields" key is not an object');
  }

  if (typeof url !== 'string') {
    throw new Error('Token body\'s "url" key is not a string');
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (err) {
    throw new Error("Token body's URL was not a valid URL");
  }
  if (parsedUrl.protocol !== 'https:') {
    throw new Error("Token body's URL was not HTTPS");
  }

  return { fields, url };
};

export const uploadDebugLogs = async (
  content: string,
  appVersion: string
): Promise<string> => {
  const headers = { 'User-Agent': getUserAgent(appVersion) };

  const signedForm = await got.get(BASE_URL, { json: true, headers });
  const { fields, url } = parseTokenBody(signedForm.body);

  const form = new FormData();
  // The API expects `key` to be the first field:
  form.append('key', fields.key);
  Object.entries(fields)
    .filter(([key]) => key !== 'key')
    .forEach(([key, value]) => {
      form.append(key, value);
    });

  const contentBuffer = await pify(gzip)(Buffer.from(content, 'utf8'));
  const contentType = 'application/gzip';
  form.append('Content-Type', contentType);
  form.append('file', contentBuffer, {
    contentType,
    filename: `signal-desktop-debug-log-${appVersion}.txt.gz`,
  });

  window.log.info('Debug log upload starting...');
  const { statusCode } = await got.post(url, { headers, body: form });
  if (statusCode !== 204) {
    throw new Error(`Failed to upload to S3, got status ${statusCode}`);
  }
  window.log.info('Debug log upload complete.');

  return `${BASE_URL}/${fields.key}`;
};
