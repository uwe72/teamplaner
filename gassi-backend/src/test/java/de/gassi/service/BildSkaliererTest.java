package de.gassi.service;

import de.gassi.TestBilder;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

public class BildSkaliererTest {

    @Test
    void jpegMitOrientation6WirdHochkantVerarbeitet() throws IOException {
        byte[] quer = TestBilder.querJpegMitOrientation6();

        AvatarService.Bild ergebnis = BildSkalierer.skalieren(quer, "image/jpeg", 256);

        BufferedImage dekodiert = ImageIO.read(new ByteArrayInputStream(ergebnis.daten()));
        assertThat(ergebnis.contentType()).isEqualTo("image/jpeg");
        assertThat(dekodiert).isNotNull();
        assertThat(dekodiert.getHeight()).isGreaterThan(dekodiert.getWidth());
    }

    @Test
    void jpegMitOrientation6WirdBeimHaEndpunktHochkantVerarbeitet() throws IOException {
        byte[] quer = TestBilder.querJpegMitOrientation6();

        AvatarService.Bild ergebnis = BildSkalierer.skalieren(quer, "image/jpeg", 128);

        BufferedImage dekodiert = ImageIO.read(new ByteArrayInputStream(ergebnis.daten()));
        assertThat(dekodiert).isNotNull();
        assertThat(dekodiert.getHeight()).isGreaterThan(dekodiert.getWidth());
    }

    @Test
    void kleinesJpegOhneOrientationBleibtUnveraendert() throws IOException {
        byte[] jpeg = TestBilder.mitOrientation6(neuesJpeg());
        byte[] ohneOrientation = entferneApp1Exif(jpeg);

        AvatarService.Bild ergebnis = BildSkalierer.skalieren(ohneOrientation, "image/jpeg", 256);

        assertThat(ergebnis.daten()).isSameAs(ohneOrientation);
        assertThat(ergebnis.contentType()).isEqualTo("image/jpeg");
    }

    @Test
    void unlesbaresBildBleibtUnveraendert() {
        byte[] fake = new byte[]{1, 2, 3, 4, 5};

        AvatarService.Bild ergebnis = BildSkalierer.skalieren(fake, "image/webp", 256);

        assertThat(ergebnis.daten()).isSameAs(fake);
        assertThat(ergebnis.contentType()).isEqualTo("image/webp");
    }

    private byte[] neuesJpeg() throws IOException {
        BufferedImage bild = new BufferedImage(100, 50, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream puffer = new ByteArrayOutputStream();
        ImageIO.write(bild, "jpg", puffer);
        return puffer.toByteArray();
    }

    private byte[] entferneApp1Exif(byte[] jpeg) {
        if ((jpeg[0] & 0xFF) != 0xFF || (jpeg[1] & 0xFF) != 0xD8) {
            return jpeg;
        }
        int pos = 2;
        while (pos + 4 <= jpeg.length) {
            if ((jpeg[pos] & 0xFF) != 0xFF) {
                return jpeg;
            }
            int marker = jpeg[pos + 1] & 0xFF;
            if (marker == 0x01 || (marker >= 0xD0 && marker <= 0xD9)) {
                pos += 2;
                continue;
            }
            int laenge = ((jpeg[pos + 2] & 0xFF) << 8) | (jpeg[pos + 3] & 0xFF);
            if (marker == 0xE1) {
                byte[] ziel = new byte[jpeg.length - (2 + laenge)];
                System.arraycopy(jpeg, 0, ziel, 0, pos);
                System.arraycopy(jpeg, pos + 2 + laenge, ziel, pos, jpeg.length - pos - 2 - laenge);
                return ziel;
            }
            pos += 2 + laenge;
        }
        return jpeg;
    }
}
