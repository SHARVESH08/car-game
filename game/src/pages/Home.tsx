import React from 'react';
import HeroSection from '../components/HeroSection';
import GameModeCard from '../components/GameModeCard';
import Leaderboard from '../components/Leaderboard';

const Home: React.FC = () => (
  <>
    <HeroSection />
    <GameModeCard />
    <Leaderboard />
  </>
);
export default Home;
