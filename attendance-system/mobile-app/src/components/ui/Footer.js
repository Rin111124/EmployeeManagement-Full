import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Theme } from '../../theme/theme';

export default function Footer({ info }) {
  const isError = info.status === 'ERROR';

  return (
    <View style={styles.footer}>
      <View style={styles.topRow}>
        <Text style={styles.label}>
          SYSTEM: <Text style={[styles.value, isError ? styles.errorText : styles.successText]}>
            {info.status}
          </Text>
        </Text>
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.infoItem}>ID: {info.id}</Text>
        <Text style={styles.infoItem}>IP: {info.ip}</Text>
        <Text style={styles.infoItem}>PORT: {info.port}</Text>
        <Text style={styles.infoItem}>GATE {info.gate}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(19, 19, 24, 0.9)',
    borderTopWidth: 2,
    borderTopColor: Theme.colors.outlineVariant,
    zIndex: 100,
    gap: 5,
  },
  topRow: {
    flexDirection: 'row',
  },
  label: {
    color: '#94A3B8',
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  value: {
    fontWeight: 'bold',
  },
  successText: {
    color: Theme.colors.green.container,
  },
  errorText: {
    color: Theme.colors.red.tertiary,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    color: Theme.colors.cyan.container,
    fontSize: 9,
    fontFamily: 'monospace',
    letterSpacing: 1,
    textTransform: 'uppercase',
  }
});
