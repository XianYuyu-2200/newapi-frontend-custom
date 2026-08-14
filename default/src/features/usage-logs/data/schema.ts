/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/

/**
 * Common usage-log response returned by /api/log.
 *
 * This mirrors model.Log's JSON shape. The task and drawing log endpoints use
 * their own types in ../types because their response fields differ.
 */
export type UsageLog = {
  id: number
  user_id: number
  created_at: number
  type: number
  content: string
  username: string
  token_name: string
  model_name: string
  quota: number
  prompt_tokens: number
  completion_tokens: number
  use_time: number
  is_stream: boolean
  channel: number
  channel_name: string
  token_id: number
  group: string
  ip: string
  request_id: string
  upstream_request_id: string
  other: string
}
