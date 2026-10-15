import {composeLetter,letterPreferences} from './letter.js';
import {isSupabase} from './service.js';
// Strict wire-data allowlists. The local plan key is not part of anonymous payloads.
export function anonymousArchivePayload(s){return {giftNumber:Number.isInteger(s.giftNumber)?s.giftNumber:null,giftBoxName:s.giftName||'',from:s.letter.from||'',giftNames:s.gifts.map(g=>g.name),letterText:composeLetter(s),language:letterPreferences(s).language,completedAt:s.completedAt||null};}
export function galleryArchivePayload(s,{name,submittedAt,status='pending',number=null,boxUrl=null,letterUrl=null}={}){const a=anonymousArchivePayload(s);return {giftNumber:a.giftNumber,giftBoxName:name??a.giftBoxName,from:a.from,giftNames:a.giftNames,letterText:a.letterText,language:a.language,submittedAt:submittedAt||new Date().toISOString(),reviewStatus:status,displayOrder:status==='approved'?number:null,publishedAt:null,boxThumbnailUrl:boxUrl,letterDetailUrl:letterUrl,giftId:s.giftId};}
export function archivePlan(s,source='anonymous',gallery={}){if(source==='anonymous'&&!s.anonymousArchive)return null;return {giftId:s.giftId,source,status:'prepared-locally',payload:source==='gallery'?galleryArchivePayload(s,gallery):anonymousArchivePayload(s)};}
// Mock remains local-only. Supabase transport runs only after explicit consent/Send.
export const ARCHIVE_TRANSPORT_ENABLED=isSupabase;
