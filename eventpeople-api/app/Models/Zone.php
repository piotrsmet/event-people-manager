<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Zone extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id',
        'name',
        'description',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function shifts()
    {
        return $this->hasMany(Shift::class);
    }
}
