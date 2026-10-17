import { useTranslation } from 'react-i18next';
import GlareHover from '../components/ui/GlareHover';
import PixelCard from '../components/ui/PixelCard';
import Reveal from '../components/ui/Reveal';
import { useTheme } from '../theme/ThemeProvider';
import { ExternalIcon } from '../components/icons';
import './FriendsPage.css';

interface Friend {
  name: string;
  host: string;
  url: string;
  avatar: string;
  zh: string;
  en: string;
  effect?: 'pixel';
}

const friends: Friend[] = [
  {
    name: '夏之',
    host: 'blog.520pro.top',
    url: 'https://blog.520pro.top/',
    avatar: 'https://avatars.githubusercontent.com/u/201088719?v=4',
    zh: 'Protect What You Love.',
    en: 'Protect What You Love.',
    effect: 'pixel'
  },
  {
    name: '白吟秋',
    host: 'blog.hangou.top',
    url: 'https://blog.hangou.top/',
    avatar: 'https://avatars.githubusercontent.com/u/300163710?v=4',
    zh: '一个安静的小站，记录学习、代码与生活。',
    en: 'A quiet little site recording learning, code, and life.'
  },
  {
    name: 'Xiaobocm',
    host: 'blog.xiaobocm.com',
    url: 'https://blog.xiaobocm.com',
    avatar: 'https://avatars.githubusercontent.com/u/262091240?v=4',
    zh: '一个热爱技术、喜欢折腾的科技爱好者。',
    en: 'A tech enthusiast who loves technology and tinkering.'
  }
];

const PIXEL_COLORS = {
  dark: ['#efd39a', '#dcae52', '#b8801f'],
  light: ['#b8801f', '#8a5b0d', '#6b4a06']
};

export default function FriendsPage() {
  const { t, i18n } = useTranslation();
  const { resolved } = useTheme();
  const isZh = i18n.language.toLowerCase().startsWith('zh');

  return (
    <div className="page friends">
      <header className="page-header">
        <Reveal>
          <h1 className="page-title">{t('friends.title')}</h1>
          <p className="page-sub">{t('friends.subtitle')}</p>
        </Reveal>
      </header>

      <div className="friends-grid">
        {friends.map((friend, index) => {
          const card = (
            <>
              <img
                className="friend-avatar"
                src={friend.avatar}
                alt={friend.name}
                width="46"
                height="46"
                loading="lazy"
              />
              <div className="friend-body">
                <div className="friend-head">
                  <span className="friend-name">{friend.name}</span>
                  <span className="friend-host">{friend.host}</span>
                </div>
                <p className="friend-desc">{isZh ? friend.zh : friend.en}</p>
              </div>
              <span className="friend-go">
                <ExternalIcon size={15} />
              </span>
            </>
          );

          return (
            <Reveal key={friend.url} delay={index * 80}>
              <a className="friends-link" href={friend.url} target="_blank" rel="noreferrer">
                {friend.effect === 'pixel' ? (
                  <PixelCard
                    className="friend-card friend-card--pixel"
                    theme={resolved}
                    colors={PIXEL_COLORS[resolved]}
                    glowColor={PIXEL_COLORS[resolved][1]}
                    gap={5}
                    speed={100}
                    pixelSize={3}
                    opacity={0.45}
                    glow={0.35}
                    radius={20}
                    noFocus>
                    <div className="friend-inner">{card}</div>
                  </PixelCard>
                ) : (
                  <GlareHover className="glass-card friend-card">
                    <div className="friend-inner">{card}</div>
                  </GlareHover>
                )}
              </a>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
