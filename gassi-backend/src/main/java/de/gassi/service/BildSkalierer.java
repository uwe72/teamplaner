package de.gassi.service;

import net.coobird.thumbnailator.Thumbnails;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Iterator;

public final class BildSkalierer {

    private BildSkalierer() {
    }

    public static AvatarService.Bild skalieren(byte[] original, String contentType, int maxKante) {
        if (kannUebernommenWerden(original, contentType, maxKante)) {
            return new AvatarService.Bild(original, contentType);
        }
        try (InputStream quelle = new ByteArrayInputStream(original)) {
            BufferedImage orientiert = Thumbnails.of(quelle)
                .scale(1.0)
                .useExifOrientation(true)
                .asBufferedImage();
            BufferedImage ziel = orientiert;
            if (Math.max(orientiert.getWidth(), orientiert.getHeight()) > maxKante) {
                ziel = Thumbnails.of(orientiert)
                    .size(maxKante, maxKante)
                    .asBufferedImage();
            }
            return new AvatarService.Bild(alsJpeg(ziel), "image/jpeg");
        } catch (Exception e) {
            return new AvatarService.Bild(original, contentType);
        }
    }

    private static boolean kannUebernommenWerden(byte[] original, String contentType, int maxKante) {
        if (!"image/jpeg".equals(contentType)) {
            return false;
        }
        return maxKanteVon(original) <= maxKante && exifOrientation(original) <= 1;
    }

    private static int maxKanteVon(byte[] original) {
        try (ImageInputStream strom = ImageIO.createImageInputStream(new ByteArrayInputStream(original))) {
            Iterator<ImageReader> leser = ImageIO.getImageReaders(strom);
            if (!leser.hasNext()) {
                return Integer.MAX_VALUE;
            }
            ImageReader leser1 = leser.next();
            try {
                leser1.setInput(strom);
                return Math.max(leser1.getWidth(0), leser1.getHeight(0));
            } finally {
                leser1.dispose();
            }
        } catch (Exception e) {
            return Integer.MAX_VALUE;
        }
    }

    private static int exifOrientation(byte[] jpeg) {
        try {
            if (jpeg.length < 4 || (jpeg[0] & 0xFF) != 0xFF || (jpeg[1] & 0xFF) != 0xD8) {
                return 1;
            }
            int pos = 2;
            while (pos + 4 <= jpeg.length) {
                if ((jpeg[pos] & 0xFF) != 0xFF) {
                    return 1;
                }
                int marker = jpeg[pos + 1] & 0xFF;
                if (marker == 0x01 || (marker >= 0xD0 && marker <= 0xD9)) {
                    pos += 2;
                    continue;
                }
                if (marker == 0xDA) {
                    return 1;
                }
                int laenge = ((jpeg[pos + 2] & 0xFF) << 8) | (jpeg[pos + 3] & 0xFF);
                if (marker == 0xE1 && laenge >= 8 && pos + 2 + laenge <= jpeg.length
                    && istExifHeader(jpeg, pos + 4)) {
                    return orientationAusTiff(jpeg, pos + 4);
                }
                pos += 2 + laenge;
            }
        } catch (Exception e) {
            return 1;
        }
        return 1;
    }

    private static boolean istExifHeader(byte[] daten, int offset) {
        return daten[offset] == 'E' && daten[offset + 1] == 'x' && daten[offset + 2] == 'i'
            && daten[offset + 3] == 'f' && daten[offset + 4] == 0 && daten[offset + 5] == 0;
    }

    private static int orientationAusTiff(byte[] daten, int exifStart) {
        try {
            int tiffStart = exifStart + 6;
            boolean littleEndian = (daten[tiffStart] & 0xFF) == 0x49;
            int ifdOffset = wert(daten, tiffStart + 4, 4, littleEndian);
            int anzahl = wert(daten, tiffStart + ifdOffset, 2, littleEndian);
            int basis = tiffStart + ifdOffset + 2;
            for (int i = 0; i < anzahl; i++) {
                int eintrag = basis + i * 12;
                if (wert(daten, eintrag, 2, littleEndian) == 0x0112) {
                    return wert(daten, eintrag + 8, 2, littleEndian);
                }
            }
        } catch (Exception e) {
            return 1;
        }
        return 1;
    }

    private static int wert(byte[] daten, int offset, int laenge, boolean littleEndian) {
        long wert = 0;
        for (int i = 0; i < laenge; i++) {
            int b = daten[offset + i] & 0xFF;
            if (littleEndian) {
                wert |= (long) b << (8 * i);
            } else {
                wert = (wert << 8) | b;
            }
        }
        return (int) wert;
    }

    private static byte[] alsJpeg(BufferedImage quelle) throws IOException {
        BufferedImage ziel = new BufferedImage(quelle.getWidth(), quelle.getHeight(),
            BufferedImage.TYPE_INT_RGB);
        Graphics2D grafik = ziel.createGraphics();
        grafik.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        grafik.setColor(Color.WHITE);
        grafik.fillRect(0, 0, ziel.getWidth(), ziel.getHeight());
        grafik.drawImage(quelle, 0, 0, null);
        grafik.dispose();
        ByteArrayOutputStream puffer = new ByteArrayOutputStream();
        ImageIO.write(ziel, "jpg", puffer);
        return puffer.toByteArray();
    }
}
