package de.gassi;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

public final class TestBilder {

    private TestBilder() {
    }

    public static byte[] querJpegMitOrientation6() throws IOException {
        BufferedImage quer = new BufferedImage(200, 100, BufferedImage.TYPE_INT_RGB);
        Graphics2D grafik = quer.createGraphics();
        grafik.setColor(Color.RED);
        grafik.fillRect(0, 0, 200, 100);
        grafik.dispose();
        ByteArrayOutputStream basis = new ByteArrayOutputStream();
        ImageIO.write(quer, "jpg", basis);
        return mitOrientation6(basis.toByteArray());
    }

    public static byte[] mitOrientation6(byte[] jpeg) throws IOException {
        byte[] exif = {
            (byte) 0xFF, (byte) 0xE1, 0x00, 0x1E,
            'E', 'x', 'i', 'f', 0x00, 0x00,
            'I', 'I', 0x2A, 0x00,
            0x08, 0x00, 0x00, 0x00,
            0x01, 0x00,
            0x12, 0x01,
            0x03, 0x00,
            0x01, 0x00, 0x00, 0x00,
            0x06, 0x00, 0x00, 0x00
        };
        ByteArrayOutputStream ziel = new ByteArrayOutputStream();
        ziel.write(jpeg, 0, 2);
        ziel.write(exif, 0, exif.length);
        ziel.write(jpeg, 2, jpeg.length - 2);
        return ziel.toByteArray();
    }
}
