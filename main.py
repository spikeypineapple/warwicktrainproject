import time
import RPi.GPIO as GPIO
GPIO.setup(16, GPIO.IN)
while 1:
     if GPIO.input(16):
         print("yes")
	 time.sleep(0.01)
     else:
         print("no")
	 time.sleep(0.01)
