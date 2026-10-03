package de.gassi.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class KuerzelUtil {

    private KuerzelUtil() {
    }

    public static String initialen(String name) {
        List<String> woerter = Arrays.stream(name.trim().split("\\s+"))
            .filter(w -> !w.isEmpty())
            .toList();
        if (woerter.isEmpty()) {
            return "?";
        }
        if (woerter.size() == 1) {
            String wort = woerter.get(0);
            return wort.substring(0, Math.min(2, wort.length())).toUpperCase(Locale.ROOT);
        }
        return ("" + woerter.get(0).charAt(0) + woerter.get(1).charAt(0)).toUpperCase(Locale.ROOT);
    }

    public static Map<String, String> eindeutigeInitialen(List<String> namen) {
        Map<String, List<String>> gruppen = new LinkedHashMap<>();
        for (String name : namen) {
            gruppen.computeIfAbsent(initialen(name), k -> new ArrayList<>()).add(name);
        }

        Map<String, String> ergebnis = new HashMap<>();
        for (Map.Entry<String, List<String>> eintrag : gruppen.entrySet()) {
            List<String> gruppe = eintrag.getValue();
            if (gruppe.size() == 1) {
                ergebnis.put(gruppe.get(0), eintrag.getKey());
                continue;
            }
            for (String name : gruppe) {
                ergebnis.put(name, verlaengertesKuerzel(name, gruppe, eintrag.getKey()));
            }
        }
        return ergebnis;
    }

    private static String verlaengertesKuerzel(String name, List<String> gruppe, String fallback) {
        String buchstaben = buchstabenVon(name);
        for (int laenge = 3; laenge <= buchstaben.length(); laenge++) {
            final int kuerzelLaenge = laenge;
            String kandidat = buchstaben.substring(0, laenge);
            long gleiche = gruppe.stream()
                .map(KuerzelUtil::buchstabenVon)
                .filter(b -> b.length() >= kuerzelLaenge && b.startsWith(kandidat))
                .count();
            if (gleiche == 1) {
                return kandidat;
            }
        }
        return fallback;
    }

    private static String buchstabenVon(String name) {
        return name.toUpperCase(Locale.ROOT).replaceAll("[^A-ZÄÖÜ]", "");
    }
}
