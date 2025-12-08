import { Icon, type IconProps } from '@chakra-ui/react';

// PCアイコン
export const PcIcon = (props: IconProps) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </Icon>
);

// スマホアイコン
export const PhoneIcon = (props: IconProps) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12" y2="18" />
  </Icon>
);

// 再生（▷）
export const PlayIcon = (props: IconProps) => (
  <Icon viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
    <path d="M8 5v14l11-7z" />
  </Icon>
);

// 停止（□）
export const StopIcon = (props: IconProps) => (
  <Icon viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
    <rect x="6" y="6" width="12" height="12" />
  </Icon>
);

// ミックス開始（ロケット）
export const RocketIcon = (props: IconProps) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 9 2 2" />
    <path d="m15 15 7 7" />
  </Icon>
);