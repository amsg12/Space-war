// تهيئة المتغيرات الأساسية
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// متغيرات اللعبة
let score = 0;
let level = 1;
let enemiesHit = 0; // عداد الأعداء المصابين
let gameOver = false;
let gameActive = true;

// الألوان
const WHITE = 'rgb(255, 255, 255)';
const GREEN = 'rgb(0, 255, 0)';
const RED = 'rgb(255, 0, 0)';

// مصفوفات الكائنات
let player;
let lasers = [];
let ufos = [];
let explosions = [];
let boss = null;
let bossLasers = [];

// الصور
const images = {};
const sounds = {};

// تحميل الصور
async function loadImages() {
    const imageFiles = {
        player: 'player.png.png',
        laser: 'laser.png.png',
        ufo1: 'ufo1.png.png',
        ufo2: 'ufo2.png.png',
        ufo3: 'ufo3.png.png',
        ufo4: 'ufo4.png.png',
        ufo5: 'ufo5.png.png',
        ufo6: 'ufo6.png.png',
        ufo7: 'ufo7.png.png',
        ufo8: 'ufo8.png.png',
        ufo900: 'ufo900.png.png',
        bg1: 'space1.png.png',
        bg2: 'space2.png.png',
        bg3: 'space3.png.png'
    };

    const promises = [];

    for (const [key, src] of Object.entries(imageFiles)) {
        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                images[key] = img;
                resolve();
            };
            img.onerror = () => {
                console.error(`خطأ في تحميل الصورة: ${src}`);
                // إنشاء صورة بديلة
                const fallbackImg = document.createElement('canvas');
                fallbackImg.width = 50;
                fallbackImg.height = 50;
                const ctx = fallbackImg.getContext('2d');
                ctx.fillStyle = 'red';
                ctx.fillRect(0, 0, 50, 50);
                images[key] = fallbackImg;
                resolve();
            };
        });
        promises.push(promise);
    }

    return Promise.all(promises);
}

// تحميل الأصوات
async function loadSounds() {
    const soundFiles = {
        shoot: 'shoot.wav',
        explosion: 'explosion.wav',
        thruster: 'thrusterFire_000.ogg',
        levelUp: 'doorOpen_002.ogg'
    };

    for (const [key, src] of Object.entries(soundFiles)) {
        sounds[key] = new Audio(src);
    }
}

// كلاس اللاعب
class Player {
    constructor() {
        this.width = 50;
        this.height = 50;
        this.x = WIDTH / 2 - this.width / 2;
        this.y = HEIGHT - this.height - 10;
        this.speedX = 0;
        this.lives = 15; // تغيير من 10 إلى 15
        this.shootCooldown = 0;
        this.shield = false; // إضافة درع الحماية
        this.shieldRadius = 60; // نصف قطر الدرع
        this.shieldAngle = 0; // زاوية دوران الدرع
    }

    update() {
        this.x += this.speedX;

        // منع اللاعب من الخروج من حدود الشاشة
        if (this.x < 0) this.x = 0;
        if (this.x > WIDTH - this.width) this.x = WIDTH - this.width;

        // تقليل وقت الانتظار بين الطلقات
        if (this.shootCooldown > 0) this.shootCooldown--;
        
        // تحديث الدرع في المرحلة الثالثة
        if (level === 3) {
            this.shield = true;
            this.shieldAngle += 0.1; // دوران الدرع
        } else {
            this.shield = false;
        }
    }

    draw() {
        if (images.player) {
            ctx.drawImage(images.player, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = GREEN;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        // رسم الدرع في المرحلة الثالثة
        if (this.shield) {
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;
            
            // رسم دائرة الدرع الخارجية
            ctx.beginPath();
            ctx.arc(centerX, centerY, this.shieldRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // رسم دائرة الدرع الداخلية
            ctx.beginPath();
            ctx.arc(centerX, centerY, this.shieldRadius - 5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // رسم خطوط دوران الدرع
            for (let i = 0; i < 8; i++) {
                const angle = this.shieldAngle + (i * Math.PI / 4);
                const x1 = centerX + Math.cos(angle) * (this.shieldRadius - 10);
                const y1 = centerY + Math.sin(angle) * (this.shieldRadius - 10);
                const x2 = centerX + Math.cos(angle) * this.shieldRadius;
                const y2 = centerY + Math.sin(angle) * this.shieldRadius;
                
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.9)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }

    shoot() {
        if (this.shootCooldown <= 0) {
            // إطلاق ليزرين - واحد من اليمين وواحد من اليسار
            const laser1 = new Laser(this.x + 10, this.y); // ليزر من اليسار
            const laser2 = new Laser(this.x + this.width - 10, this.y); // ليزر من اليمين
            lasers.push(laser1, laser2);
            this.shootCooldown = 10; // وقت الانتظار بين الطلقات
            playSound('shoot');
        }
    }
}

// كلاس الليزر
class Laser {
    constructor(x, y) {
        this.width = 8;
        this.height = 25;
        this.x = x - this.width / 2;
        this.y = y;
        this.speed = 10;
        this.active = true;
    }

    update() {
        this.y -= this.speed;
        if (this.y < -this.height) {
            this.active = false;
        }
    }

    draw() {
        if (images.laser) {
            ctx.drawImage(images.laser, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = GREEN;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

// كلاس العدو
class UFO {
    constructor(level = 1) {
        this.level = level;
        this.width = level === 1 ? 60 : 65;
        this.height = level === 1 ? 60 : 65;
        this.x = Math.random() * (WIDTH - this.width);
        this.y = Math.random() * (HEIGHT / 3);
        this.speedX = (Math.random() * 2 - 1) * (level * 0.5 + 1);
        this.speedY = Math.random() * (level * 0.3) + 0.5;
        this.health = level === 1 ? 3 : 5;
        this.active = true;
        this.imageKey = this.getRandomImageKey();
    }

    getRandomImageKey() {
        if (this.level === 1) {
            const keys = ['ufo1', 'ufo2', 'ufo3', 'ufo4'];
            return keys[Math.floor(Math.random() * keys.length)];
        } else {
            const keys = ['ufo5', 'ufo6', 'ufo7', 'ufo8'];
            return keys[Math.floor(Math.random() * keys.length)];
        }
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // ارتداد من حواف الشاشة
        if (this.x <= 0 || this.x >= WIDTH - this.width) {
            this.speedX = -this.speedX;
        }

        // إعادة تعيين الموقع إذا خرج من أسفل الشاشة
        if (this.y > HEIGHT) {
            this.y = -this.height;
            this.x = Math.random() * (WIDTH - this.width);
        }
    }

    draw() {
        if (images[this.imageKey]) {
            ctx.drawImage(images[this.imageKey], this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = RED;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        // رسم شريط الصحة
        const maxHealth = this.level === 1 ? 3 : 5;
        const healthBarWidth = this.width;
        const healthBarHeight = 5;
        const healthPercentage = this.health / maxHealth;

        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fillRect(this.x, this.y - 10, healthBarWidth, healthBarHeight);

        ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.fillRect(this.x, this.y - 10, healthBarWidth * healthPercentage, healthBarHeight);
    }
}

// كلاس الوحش الأم (Boss)
class Boss {
    constructor() {
        this.width = 100;
        this.height = 100;
        this.x = WIDTH / 2 - this.width / 2;
        this.y = 50;
        this.speedX = 2;
        this.health = 30;
        this.maxHealth = 30;
        this.active = true;
        this.shootCooldown = 0;
        this.movementPattern = 0; // نمط الحركة
        this.patternTimer = 0;
    }

    update() {
        this.patternTimer++;
        
        // تغيير نمط الحركة كل 200 إطار
        if (this.patternTimer > 200) {
            this.movementPattern = (this.movementPattern + 1) % 3;
            this.patternTimer = 0;
        }

        // أنماط حركة مختلفة
        switch (this.movementPattern) {
            case 0: // حركة أفقية
                this.x += this.speedX;
                if (this.x <= 0 || this.x >= WIDTH - this.width) {
                    this.speedX = -this.speedX;
                }
                break;
            case 1: // حركة دائرية
                this.x = WIDTH / 2 - this.width / 2 + Math.sin(this.patternTimer / 30) * 150;
                this.y = 80 + Math.cos(this.patternTimer / 30) * 50;
                break;
            case 2: // حركة متعرجة
                this.x += this.speedX;
                this.y = 80 + Math.sin(this.patternTimer / 10) * 30;
                if (this.x <= 0 || this.x >= WIDTH - this.width) {
                    this.speedX = -this.speedX;
                }
                break;
        }

        // إطلاق الليزر
        this.shootCooldown--;
        if (this.shootCooldown <= 0) {
            this.shoot();
            this.shootCooldown = 30; // معدل إطلاق النار
        }
    }

    draw() {
        if (images.ufo900) {
            ctx.drawImage(images.ufo900, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = 'purple';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        // رسم شريط الصحة
        const healthBarWidth = this.width * 1.5;
        const healthBarHeight = 10;
        const healthPercentage = this.health / this.maxHealth;

        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fillRect(WIDTH / 2 - healthBarWidth / 2, 20, healthBarWidth, healthBarHeight);

        ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.fillRect(WIDTH / 2 - healthBarWidth / 2, 20, healthBarWidth * healthPercentage, healthBarHeight);
    }

    shoot() {
        // إطلاق ثلاثة ليزر في اتجاهات مختلفة
        const centerX = this.x + this.width / 2;
        const bottomY = this.y + this.height;
        
        // ليزر مباشر للأسفل
        bossLasers.push(new BossLaser(centerX, bottomY, 0, 5));
        
        // ليزر يمين
        bossLasers.push(new BossLaser(centerX, bottomY, 2, 4));
        
        // ليزر يسار
        bossLasers.push(new BossLaser(centerX, bottomY, -2, 4));
        
        playSound('shoot');
    }
}

// كلاس ليزر الوحش الأم
class BossLaser {
    constructor(x, y, speedX, speedY) {
        this.width = 10;
        this.height = 20;
        this.x = x - this.width / 2;
        this.y = y;
        this.speedX = speedX;
        this.speedY = speedY;
        this.active = true;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        if (this.y > HEIGHT || this.x < 0 || this.x > WIDTH) {
            this.active = false;
        }
    }

    draw() {
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // إضافة توهج للليزر
        ctx.fillStyle = 'rgba(255, 100, 100, 0.5)';
        ctx.fillRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);
    }
}

// كلاس الانفجار
class Explosion {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.radius = 1;
        this.maxRadius = size / 2;
        this.active = true;
        this.particles = [];
        
        // إنشاء جزيئات عشوائية للانفجار
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: this.x,
                y: this.y,
                speedX: (Math.random() - 0.5) * 5,
                speedY: (Math.random() - 0.5) * 5,
                radius: Math.random() * 3 + 1,
                color: `rgb(${Math.floor(Math.random() * 100 + 155)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 50)})`
            });
        }
    }

    update() {
        this.radius += 2;
        if (this.radius > this.maxRadius) {
            this.active = false;
        }
        
        // تحديث الجزيئات
        for (const particle of this.particles) {
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            particle.radius *= 0.95;
        }
    }

    draw() {
        // رسم دائرة الانفجار
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 100, 0, ${1 - this.radius / this.maxRadius})`;
        ctx.fill();
        
        // رسم الجزيئات
        for (const particle of this.particles) {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.fill();
        }
    }
}

// تشغيل الأصوات
function playSound(soundName) {
    if (sounds[soundName]) {
        const sound = sounds[soundName].cloneNode();
        sound.volume = 0.5;
        sound.play().catch(e => console.error('خطأ في تشغيل الصوت:', e));
    }
}

// إنشاء الأعداء
function createUFOs() {
    const count = level === 1 ? 5 : (level === 2 ? 8 : 0);
    for (let i = 0; i < count; i++) {
        ufos.push(new UFO(level));
    }
}

// فحص التصادم بين كائنين مع الدرع
function checkCollision(obj1, obj2) {
    // فحص التصادم العادي
    const normalCollision = obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
    
    // إذا كان هناك تصادم عادي، تحقق من الدرع
    if (normalCollision && obj1 === player && player.shield) {
        const centerX = player.x + player.width / 2;
        const centerY = player.y + player.height / 2;
        const obj2CenterX = obj2.x + obj2.width / 2;
        const obj2CenterY = obj2.y + obj2.height / 2;
        
        // حساب المسافة بين مراكز الكائنين
        const distance = Math.sqrt(
            Math.pow(centerX - obj2CenterX, 2) + 
            Math.pow(centerY - obj2CenterY, 2)
        );
        
        // إذا كان الكائن خارج نطاق الدرع، يحدث التصادم
        return distance > player.shieldRadius;
    }
    
    return normalCollision;
}

// تحديث حالة اللعبة
function update() {
    if (!gameActive) return;

    // تحديث اللاعب
    player.update();

    // تحديث الليزر
    for (let i = lasers.length - 1; i >= 0; i--) {
        lasers[i].update();
        if (!lasers[i].active) {
            lasers.splice(i, 1);
        }
    }

    // تحديث الأعداء
    for (let i = ufos.length - 1; i >= 0; i--) {
        ufos[i].update();

        // فحص التصادم مع الليزر
        for (let j = lasers.length - 1; j >= 0; j--) {
            if (checkCollision(lasers[j], ufos[i])) {
                ufos[i].health--;
                lasers.splice(j, 1);
                
                if (ufos[i].health <= 0) {
                    // إنشاء انفجار
                    explosions.push(new Explosion(
                        ufos[i].x + ufos[i].width / 2,
                        ufos[i].y + ufos[i].height / 2,
                        ufos[i].width
                    ));
                    
                    // زيادة النقاط
                    score += 2; // تغيير إلى نقطتين لكل عدو
                    enemiesHit += 2; // زيادة عداد الأعداء المصابين (كل عدو = 2)
                    updateEnemiesHit(); // تحديث العرض
                    updateScore();
                    
                    // تشغيل صوت الانفجار
                    playSound('explosion');
                    
                    ufos.splice(i, 1);
                    
                    // التحقق من انتهاء المرحلة
                    if (level === 1 && enemiesHit >= 100) {
                        setTimeout(() => {
                            levelUp();
                        }, 500);
                    } else if (level === 2 && enemiesHit >= 200) { // 100 + 100
                        setTimeout(() => {
                            levelUp();
                        }, 500);
                    } else if (level === 3 && enemiesHit >= 250) { // 100 + 100 + 50
                        setTimeout(() => {
                            showVictory();
                            gameActive = false;
                        }, 500);
                    }
                }
                break;
            }
        }

        // فحص التصادم مع اللاعب
        if (ufos[i] && checkCollision(player, ufos[i])) {
            player.lives--;
            updateLives();
            
            // إنشاء انفجار
            explosions.push(new Explosion(
                ufos[i].x + ufos[i].width / 2,
                ufos[i].y + ufos[i].height / 2,
                ufos[i].width
            ));
            
            // تشغيل صوت الانفجار
            playSound('explosion');
            
            ufos.splice(i, 1);
            
            if (player.lives <= 0) {
                gameOver = true;
                gameActive = false;
                showGameOver();
            }
        }
    }

    // تحديث الوحش الأم (إذا كان موجودًا)
    if (boss) {
        boss.update();

        // فحص التصادم مع ليزر اللاعب
        for (let i = lasers.length - 1; i >= 0; i--) {
            if (checkCollision(lasers[i], boss)) {
                boss.health--;
                lasers.splice(i, 1);
                
                if (boss.health <= 0) {
                    // إنشاء انفجار كبير ومثير للوحش الأم
                    for (let j = 0; j < 15; j++) { // زيادة عدد الانفجارات من 5 إلى 15
                        explosions.push(new Explosion(
                            boss.x + Math.random() * boss.width,
                            boss.y + Math.random() * boss.height,
                            boss.width + Math.random() * 50 // زيادة حجم الانفجارات
                        ));
                    }
                    
                    // إضافة انفجارات إضافية في أطراف الوحش الأم
                    for (let k = 0; k < 8; k++) {
                        explosions.push(new Explosion(
                            boss.x + (k % 2 === 0 ? 0 : boss.width),
                            boss.y + (k < 4 ? 0 : boss.height),
                            boss.width / 3
                        ));
                    }
                    
                    // زيادة النقاط
                    score += 100; // تغيير من 50 إلى 100 نقطة للوحش الأم
                    enemiesHit += 2; // زيادة عداد الأعداء المصابين (كل عدو = 2)
                    updateEnemiesHit(); // تحديث العرض
                    updateScore();
                    
                    // تشغيل صوت الانفجار
                    playSound('explosion');
                    
                    boss = null;
                    showVictory();
                    gameActive = false;
                }
            }
        }
    }

    // تحديث ليزر الوحش الأم
    for (let i = bossLasers.length - 1; i >= 0; i--) {
        bossLasers[i].update();
        
        // فحص التصادم مع اللاعب
        if (checkCollision(bossLasers[i], player)) {
            player.lives--;
            updateLives();
            bossLasers.splice(i, 1);
            
            if (player.lives <= 0) {
                gameOver = true;
                gameActive = false;
                showGameOver();
            }
        }
        
        if (!bossLasers[i]?.active) {
            bossLasers.splice(i, 1);
        }
    }

    // تحديث الانفجارات
    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].update();
        if (!explosions[i].active) {
            explosions.splice(i, 1);
        }
    }

    // إنشاء أعداء جدد إذا لم يكن هناك أعداء
    if (ufos.length === 0 && !boss && level < 3) {
        createUFOs();
    }
}

// رسم اللعبة
function draw() {
    // رسم الخلفية
    let bgImage;
    if (level === 1) bgImage = images.bg1;
    else if (level === 2) bgImage = images.bg2;
    else bgImage = images.bg3;
    
    if (bgImage) {
        ctx.drawImage(bgImage, 0, 0, WIDTH, HEIGHT);
    } else {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        
        // رسم نجوم عشوائية للخلفية
        ctx.fillStyle = 'white';
        for (let i = 0; i < 100; i++) {
            ctx.beginPath();
            ctx.arc(
                Math.random() * WIDTH,
                Math.random() * HEIGHT,
                Math.random() * 2,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
    }

    // رسم اللاعب
    player.draw();

    // رسم الليزر
    for (const laser of lasers) {
        laser.draw();
    }

    // رسم الأعداء
    for (const ufo of ufos) {
        ufo.draw();
    }

    // رسم الوحش الأم (إذا كان موجودًا)
    if (boss) {
        boss.draw();
    }

    // رسم ليزر الوحش الأم
    for (const laser of bossLasers) {
        laser.draw();
    }

    // رسم الانفجارات
    for (const explosion of explosions) {
        explosion.draw();
    }
}

// تحديث النقاط في واجهة المستخدم
function updateScore() {
    document.getElementById('score').textContent = `النقاط: ${score}`;
}

// تحديث المرحلة في واجهة المستخدم
function updateLevel() {
    document.getElementById('level').textContent = `المرحلة: ${level}`;
}

// تحديث الحياة في واجهة المستخدم
function updateLives() {
    document.getElementById('lives').textContent = `الحياة: ${player.lives}`;
}

// إضافة دالة لتحديث عرض الأعداء المصابين
function updateEnemiesHit() {
    let currentLevelEnemies = 0;
    if (level === 1) {
        currentLevelEnemies = enemiesHit;
    } else if (level === 2) {
        currentLevelEnemies = enemiesHit - 100;
    } else if (level === 3) {
        currentLevelEnemies = enemiesHit - 200;
    }
    
    let requiredEnemies = level === 3 ? 50 : 100;
    document.getElementById('shots').textContent = `الأعداء: ${currentLevelEnemies}/${requiredEnemies}`;
}

// الانتقال للمرحلة التالية
function levelUp() {
    level++;
    
    updateLevel();
    
    // إظهار رسالة الانتقال للمرحلة التالية
    const levelUpDiv = document.createElement('div');
    levelUpDiv.className = 'level-up';
    levelUpDiv.textContent = `المرحلة ${level}`;
    document.querySelector('.game-container').appendChild(levelUpDiv);
    
    // تشغيل صوت الانتقال للمرحلة التالية
    playSound('levelUp');
    
    // إيقاف اللعبة مؤقتًا
    gameActive = false;
    
    // إزالة جميع الأعداء والليزر
    ufos = [];
    lasers = [];
    bossLasers = [];
    
    // إنشاء الوحش الأم في المرحلة الثالثة
    if (level === 3) {
        boss = new Boss();
    }
    
    // استئناف اللعبة بعد ثانيتين
    setTimeout(() => {
        document.querySelector('.level-up')?.remove();
        gameActive = true;
        if (level < 3) {
            createUFOs();
        }
    }, 2000);
}

// إظهار رسالة انتهاء اللعبة
function showGameOver() {
    const gameOverDiv = document.createElement('div');
    gameOverDiv.className = 'game-over';
    gameOverDiv.innerHTML = `
        <h2>انتهت اللعبة</h2>
        <p>النقاط: ${score}</p>
        <button id="restartBtn">إعادة اللعب</button>
    `;
    document.querySelector('.game-container').appendChild(gameOverDiv);
    
    document.getElementById('restartBtn').addEventListener('click', restartGame);
}

// إظهار رسالة الفوز
function showVictory() {
    const victoryDiv = document.createElement('div');
    victoryDiv.className = 'level-up';
    victoryDiv.innerHTML = `
        <h2>مبروك! لقد فزت</h2>
        <p>النقاط: ${score}</p>
        <button id="restartBtn">إعادة اللعب</button>
    `;
    document.querySelector('.game-container').appendChild(victoryDiv);
    
    document.getElementById('restartBtn').addEventListener('click', restartGame);
}

// إعادة تشغيل اللعبة
function restartGame() {
    // إعادة تعيين متغيرات اللعبة
    score = 0;
    level = 1;
    enemiesHit = 0; // إعادة تعيين عداد الأعداء المصابين
    gameOver = false;
    gameActive = true;
    
    // إعادة تعيين الكائنات
    player = new Player();
    lasers = [];
    ufos = [];
    explosions = [];
    bossLasers = [];
    boss = null;
    
    // تحديث واجهة المستخدم
    updateScore();
    updateLevel();
    updateLives();
    updateEnemiesHit();
    
    // إنشاء أعداء جدد
    createUFOs();
    
    // إزالة رسائل انتهاء اللعبة
    document.querySelector('.game-over')?.remove();
    document.querySelector('.level-up')?.remove();
}

// التعامل مع مدخلات المستخدم
function handleInput() {
    window.addEventListener('keydown', (e) => {
        if (!gameActive) return;
        
        if (e.key === 'ArrowLeft') {
            player.speedX = -8;
        } else if (e.key === 'ArrowRight') {
            player.speedX = 8;
        } else if (e.key === ' ') {
            player.shoot();
            e.preventDefault(); // منع تمرير الحدث للصفحة
        }
    });
    
    window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            player.speedX = 0;
        }
    });
    
    // إضافة دعم للأجهزة اللوحية والهواتف
    canvas.addEventListener('touchstart', (e) => {
        if (!gameActive) return;
        
        const touch = e.touches[0];
        const touchX = touch.clientX - canvas.getBoundingClientRect().left;
        
        if (touchX < WIDTH / 3) {
            player.speedX = -8;
        } else if (touchX > WIDTH * 2 / 3) {
            player.speedX = 8;
        } else {
            player.shoot();
        }
        
        e.preventDefault();
    });
    
    canvas.addEventListener('touchend', () => {
        player.speedX = 0;
    });
}

// حلقة اللعبة الرئيسية
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// بدء اللعبة
async function startGame() {
    // تحميل الصور والأصوات
    await loadImages();
    await loadSounds();
    
    // إنشاء اللاعب والأعداء
    player = new Player();
    createUFOs();
    
    // تهيئة مدخلات المستخدم
    handleInput();
    
    // تحديث واجهة المستخدم
    updateScore();
    updateLevel();
    updateLives();
    updateEnemiesHit();
    
    // بدء حلقة اللعبة
    gameLoop();
}

// بدء اللعبة عند تحميل الصفحة
window.addEventListener('load', startGame);
