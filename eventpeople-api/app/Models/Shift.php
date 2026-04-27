<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Shift extends Model
{
    use HasFactory;

    protected $fillable = [
        'zone_id',
        'start_time',
        'end_time',
        'required_people',
        'required_role'
    ];

    public function zone()
    {
        return $this->belongsTo(Zone::class);
    }

    public function users()
    {
        return $this->belongsToMany(User::class)->withPivot('status')->withTimestamps();
    }
}
