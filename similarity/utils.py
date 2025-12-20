import cv2
import numpy as np

orb = cv2.ORB_create(nfeatures=1000)

def image_to_gray(image):
    return cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)

def compute_similarity(img1, img2):
    gray1 = image_to_gray(img1)
    gray2 = image_to_gray(img2)

    kp1, des1 = orb.detectAndCompute(gray1, None)
    kp2, des2 = orb.detectAndCompute(gray2, None)

    if des1 is None or des2 is None:
        return 0.0

    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = bf.match(des1, des2)

    matches = sorted(matches, key=lambda x: x.distance)
    good_matches = [m for m in matches if m.distance < 50]

    similarity = len(good_matches) / max(len(kp1), len(kp2))
    return round(similarity, 4)
