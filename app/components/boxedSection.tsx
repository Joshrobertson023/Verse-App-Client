import React from 'react';
import useStyles from '../styles';
import useAppTheme from '../theme';

interface BoxedSectionProps {
  title: string;
  numericStat: number;
  alert?: boolean;
  icon: string;
}

const BoxedSection: React.FC<BoxedSectionProps> = ({ title, numericStat, icon, alert }) => {
  const styles = useStyles();
  const theme = useAppTheme();
  return (
    <>

    </>
  )
}

export default BoxedSection;